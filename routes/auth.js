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

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

    // Check if user exists
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

    if (user) {
      return res.json({
        success: true,
        exists: true,
        user: user,
        message: 'User already registered'
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
        message: 'User not found'
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

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: { phoneNumber }
      });
    }

    // Generate OTP
    const otpCode = generateOTP();

    // Save OTP to database
    await prisma.oTP.create({
      data: {
        phoneNumber,
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    // For development: Log OTP to console instead of sending SMS
    console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
    console.log(`📱 Use this OTP to verify: ${otpCode}`);
    
    // TODO: Uncomment below for production SMS sending
    // try {
    //   await client.messages.create({
    //     body: `Your Bandage verification code is: ${otpCode}. This code will expire in 5 minutes.`,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     to: phoneNumber
    //   });
    // } catch (twilioError) {
    //   console.error('Twilio error:', twilioError);
    //   return res.status(503).json({
    //     success: false,
    //     message: 'Failed to send SMS. Please try again later.'
    //   });
    // }

    res.json({
      success: true,
      message: 'OTP generated successfully (check console for development)',
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

    // Update user verification status
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
        message: 'User not found'
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
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
