const express = require('express');
const { body, validationResult } = require('express-validator');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Debug: Log Twilio credentials (masked for security)
console.log('🔧 Twilio Configuration:');
console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'NOT SET');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 8)}...` : 'NOT SET');
console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Clean up expired OTPs
const cleanupExpiredOTPs = async () => {
  try {
    await prisma.oTP.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
};

// Test Twilio connection
router.get('/test-twilio', async (req, res) => {
  try {
    console.log('🧪 Testing Twilio connection...');
    
    // Test Twilio credentials by fetching account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    res.json({
      success: true,
      message: 'Twilio connection successful',
      data: {
        accountSid: account.sid,
        accountName: account.friendlyName,
        status: account.status,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      }
    });
  } catch (error) {
    console.error('❌ Twilio connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Twilio connection failed',
      error: error.message,
      details: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'NOT SET'
      }
    });
  }
});

// Check if user exists
router.post('/check-user', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;
    
    console.log('🔍 Check user - Phone number received:', phoneNumber);

    // Check if user exists and is verified
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        isVerified: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    if (user && user.isVerified) {
      return res.json({
        success: true,
        exists: true,
        user: user,
        message: 'User already registered and verified'
      });
    } else if (user && !user.isVerified) {
      return res.json({
        success: true,
        exists: true,
        user: user,
        message: 'User exists but not verified'
      });
    } else {
      return res.json({
        success: true,
        exists: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Auto-login for existing users (without OTP)
router.post('/auto-login', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;

    // Check if user exists and is verified
    const user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User not verified. Please complete OTP verification first.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        phoneNumber: user.phoneNumber 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Auto-login successful',
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send OTP
router.post('/send-otp', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;
    
    console.log('📱 Send OTP - Phone number received:', phoneNumber);

    // Check if user already exists and is verified
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already registered and verified'
      });
    }
    
    // If user exists but is not verified, allow OTP resending
    if (existingUser && !existingUser.isVerified) {
      console.log('📱 User exists but not verified, allowing OTP resend');
    }

    // Clean up expired OTPs first
    await cleanupExpiredOTPs();

    // Generate OTP
    const otpCode = generateOTP();

    // Create or update user first (required for foreign key constraint)
    let user = existingUser;
    if (!user) {
      // Create new user if doesn't exist
      user = await prisma.user.create({
        data: { 
          phoneNumber,
          isVerified: false 
        }
      });
      console.log('📱 Created new user for OTP');
    } else {
      // User exists but not verified, update lastActive
      user = await prisma.user.update({
        where: { phoneNumber },
        data: { 
          lastActive: new Date() 
        }
      });
      console.log('📱 Updated existing unverified user for OTP resend');
    }

    // Save OTP to database (now user exists)
    await prisma.oTP.create({
      data: {
        phoneNumber,
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    // Send SMS via Twilio
    try {
      console.log(`📱 Sending SMS to ${phoneNumber}...`);
      console.log(`📱 From: ${process.env.TWILIO_PHONE_NUMBER}`);
      console.log(`📱 To: ${phoneNumber}`);
      
      const message = await client.messages.create({
        body: `Your Ilaaj AI verification code is: ${otpCode}. This code will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      console.log(`✅ SMS sent successfully. Message SID: ${message.sid}`);
      console.log(`✅ Message Status: ${message.status}`);
      console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
    } catch (twilioError) {
      console.error('❌ Twilio SMS error:', twilioError);
      console.error('❌ Error Code:', twilioError.code);
      console.error('❌ Error Message:', twilioError.message);
      console.error('❌ More Info:', twilioError.moreInfo);
      
      // Handle trial account restrictions
      if (twilioError.code === 21608) {
        console.log('\n💡 TRIAL ACCOUNT RESTRICTION DETECTED');
        console.log('📱 Trial accounts can only send SMS to verified numbers');
        console.log('🔧 Solutions:');
        console.log('1. Upgrade to a full Twilio account');
        console.log('2. Verify the phone number in Twilio Console');
        console.log('3. Use the OTP from console for development');
        console.log('\n🔐 DEVELOPMENT OTP:');
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔐 OTP: ${otpCode}`);
        console.log(`⏰ Expires: 5 minutes`);
        
        // Return success with development OTP
        return res.json({
          success: true,
          message: 'OTP generated successfully (SMS blocked by trial account restrictions)',
          data: {
            phoneNumber,
            expiresIn: 300,
            otp: otpCode,
            development: true,
            note: 'SMS blocked by trial account. Use OTP from server console.'
          }
        });
      }
      
      // Log OTP to console as fallback for development
      console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
      console.log(`📱 Use this OTP to verify: ${otpCode}`);
      
      return res.status(503).json({
        success: false,
        message: 'Failed to send SMS. Please try again later.',
        error: twilioError.message,
        errorCode: twilioError.code,
        moreInfo: twilioError.moreInfo
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully via SMS',
      data: {
        phoneNumber,
        expiresIn: 300, // 5 minutes in seconds
        otp: otpCode // Include OTP in response for development
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber, otp } = req.body;

    // Clean up expired OTPs first
    await cleanupExpiredOTPs();

    // Find OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phoneNumber,
        code: otp,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    // Update user verification status (user should already exist from send-otp)
    const user = await prisma.user.update({
      where: { phoneNumber },
      data: { 
        isVerified: true, 
        lastActive: new Date() 
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please request OTP first.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            email: user.email
          }
        },
        token
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          phoneNumber: req.user.phoneNumber,
          isVerified: req.user.isVerified,
          profile: {
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            dateOfBirth: req.user.dateOfBirth,
            gender: req.user.gender,
            email: req.user.email
          },
          preferences: {
            language: req.user.language,
            notifications: req.user.notifications
          },
          lastActive: req.user.lastActive
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('firstName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, dateOfBirth, gender, email } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (email) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            email: user.email
          },
          preferences: {
            language: user.language,
            notifications: user.notifications
          }
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout (optional - mainly for token blacklisting in production)
router.post('/logout', async (req, res) => {
  try {
    // Try to get the token and validate it, but don't fail if it's invalid
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Logout: Valid token for user', decoded.userId);
        
        // In a production app, you might want to blacklist the token here
        // For now, we'll just log the logout
      } catch (tokenError) {
        console.log('Logout: Invalid or expired token, but allowing logout');
      }
    } else {
      console.log('Logout: No token provided, but allowing logout');
    }
    
    // Always return success for logout, even if token is invalid
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, return success for logout
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

module.exports = router;
