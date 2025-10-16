const crypto = require("crypto");

// API configuration
const API_URL = 'https://enneaprofiling.estamart.com/api/send_email';
const API_KEY = 'fictionsupermailer';

async function sendEmail({ to, subject, text, html }) {
  try {
    console.log('Attempting to send email via API to:', to);
    console.log('Subject:', subject);
    
    // Use HTML if provided, otherwise use text
    const body = html || text;
    
    const requestBody = {
      api_key: API_KEY,
      email: to,
      subject: subject,
      body: body,
      from_name: "Implanner"
    };
    
    console.log('API request body:', {
      api_key: API_KEY,
      email: to,
      subject: subject,
      bodyLength: body.length,
      from_name: "Implanner"
    });
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} - ${result.message || 'Unknown error'}`);
    }
    
    console.log('Email sent successfully via API:', result);
    return { success: true, result: result };
    
  } catch (error) {
    console.error('Failed to send email via API:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

/**
 * Generate a numeric verification code (6 digits, 1-9 only)
 */
function generateNumericVerificationCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    // Generate random number from 1-9 (not 0)
    code += Math.floor(Math.random() * 9) + 1;
  }
  return code;
}

/**
 * Create beautiful HTML email template for verification
 */
function createVerificationEmailTemplate(userName, verificationCode, isGoogleUser = false) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Implanner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #328DFF 0%, #1e5bb8 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 25px;
            text-align: center;
        }
        
        .verification-box {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .verification-text {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        
        .verification-code {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            background-color: #f8f9fa;
            border: 3px solid #28a745;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            letter-spacing: 3px;
            font-family: 'Courier New', monospace;
        }
        
        .steps {
            background-color: #e8f5e8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .steps h3 {
            color: #28a745;
            margin-bottom: 15px;
        }
        
        .steps ol {
            margin-left: 20px;
        }
        
        .steps li {
            margin-bottom: 8px;
            color: #555;
        }
        
        .security-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
            font-size: 14px;
            color: #856404;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 20px 15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .content {
                padding: 25px 20px;
            }
            
            .verification-code {
                font-size: 28px;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Welcome to Implanner!</h1>
            <p>Please verify your email address to complete your ${isGoogleUser ? 'Google account setup' : 'registration'}</p>
        </div>
        
        <div class="content">
            <div class="welcome-text">
                Hello <strong>${userName}</strong>,<br>
                Thank you for ${isGoogleUser ? 'signing up with Google and creating' : 'creating'} your Implanner account!
            </div>
            
            <div class="verification-box">
                <div class="verification-text">
                    Your verification code is:
                </div>
                
                <div class="verification-code">${verificationCode}</div>
                
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Enter this 6-digit numeric code on the verification page to complete your registration.
                </p>
            </div>
            
            <div class="steps">
                <h3>📋 Next Steps:</h3>
                <ol>
                    <li>Copy the 6-digit verification code above</li>
                    <li>Go to the verification page</li>
                    <li>Enter the numeric code and click verify</li>
                    <li>Return here to sign in</li>
                </ol>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This verification code will expire in 24 hours. 
                If you didn't create this account, please ignore this email.
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                After verification, you'll be able to sign in and view your personalized treatment plan.
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Implanner. Please do not reply to this email.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>© 2024 Implanner. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}

async function sendVerificationEmail(userEmail, userName, verificationCode, isGoogleUser = false) {
  try {
    console.log('Attempting to send verification email to:', userEmail);
    console.log('User type:', isGoogleUser ? 'Google' : 'Manual');
    
    // Use the provided verification code
    const code = String(verificationCode).trim();
    console.log('Verification code to send:', code);
    
    const htmlContent = createVerificationEmailTemplate(userName, code, isGoogleUser);
    
    const subject = isGoogleUser
      ? "🔐 Verify Your Google Account - Implanner"
      : "🔐 Verify Your Email - Implanner Account";
    
    const result = await sendEmail({
      to: userEmail,
      subject: subject,
      html: htmlContent,
      text: `Welcome to Implanner! Your verification code is: ${code}. Enter this code on the verification page to complete your ${isGoogleUser ? 'Google account setup' : 'registration'}.`
    });
    
    console.log('Verification email sent successfully');
    console.log('Verification code sent:', code);
    return result;
    
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
}

async function sendWelcomeEmail(userEmail, userName) {
  try {
    const welcomeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Implanner!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #328DFF; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Email Verified Successfully!</h1>
        </div>
        <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Your email has been verified successfully. You can now:</p>
            <ul>
                <li>Sign in to your account</li>
                <li>View your personalized treatment plan</li>
                <li>Connect with expert dental clinics</li>
            </ul>
            <p style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                    Sign In Now
                </a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: userEmail,
      subject: "🎉 Welcome to Implanner - Email Verified!",
      html: welcomeHtml,
      text: `Welcome to Implanner! Your email has been verified. You can now sign in to your account.`
    });
    
    console.log('Welcome email sent successfully');
    return result;
    
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(userEmail, userName, newPassword) {
  try {
    const resetHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Implanner</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
        .password-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset - Implanner</h1>
        </div>
        <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Your password for Implanner has been reset.</p>
            
            <div class="password-box">
                <strong>Your new password is:</strong> <span style="font-family: monospace; font-size: 18px;">${newPassword}</span>
            </div>
            
            <p>Please log in with this new password and consider changing it to something more memorable.</p>
            
            <p><strong>Important:</strong> If you did not request a password reset, please contact support immediately.</p>
            
            <p style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                    Sign In Now
                </a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: userEmail,
      subject: "🔐 Your Password Has Been Reset - Implanner",
      html: resetHtml,
      text: `Your new password is: ${newPassword}. Please log in and consider changing it to something more memorable.`
    });
    
    console.log('Password reset email sent successfully');
    return result;
    
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create HTML email template for consultation cancellation
 */
function createConsultationCancellationTemplate(patientName, consultationDate, consultationTime, reason, doctorName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consultation Cancelled - Implanner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 25px;
        }
        
        .cancellation-details {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #333;
        }
        
        .reason-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .reason-box h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .next-steps {
            background-color: #e8f5e8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .next-steps h3 {
            color: #28a745;
            margin-bottom: 15px;
        }
        
        .next-steps ul {
            margin-left: 20px;
        }
        
        .next-steps li {
            margin-bottom: 8px;
            color: #555;
        }
        
        .contact-info {
            background-color: #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        
        .contact-info h3 {
            color: #1976d2;
            margin-bottom: 10px;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 20px 15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .content {
                padding: 25px 20px;
            }
            
            .detail-row {
                flex-direction: column;
            }
            
            .detail-label {
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Consultation Cancelled</h1>
            <p>Your appointment has been cancelled</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello <strong>${patientName}</strong>,
            </div>
            
            <p>We regret to inform you that your consultation appointment has been cancelled.</p>
            
            <div class="cancellation-details">
                <h3 style="margin-bottom: 20px; color: #333;">📅 Appointment Details</h3>
                
                <div class="detail-row">
                    <span class="detail-label">Doctor:</span>
                    <span class="detail-value">${doctorName}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${consultationDate}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${consultationTime}</span>
                </div>
            </div>
            
            <div class="reason-box">
                <h3>📝 Cancellation Reason</h3>
                <p>${reason}</p>
            </div>
            
            <div class="next-steps">
                <h3>🔄 What's Next?</h3>
                <ul>
                    <li>You can reschedule your consultation at your convenience</li>
                    <li>Contact us if you have any questions about the cancellation</li>
                    <li>We apologize for any inconvenience this may cause</li>
                </ul>
            </div>
            
            <div class="contact-info">
                <h3>📞 Need Help?</h3>
                <p>If you have any questions or need to reschedule, please don't hesitate to contact us.</p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                We look forward to serving you in the future.
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Implanner. Please do not reply to this email.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>© 2024 Implanner. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}

async function sendConsultationCancellationEmail(patientEmail, patientName, consultationDate, consultationTime, reason, doctorName) {
  try {
    console.log('Attempting to send consultation cancellation email to:', patientEmail);
    
    const htmlContent = createConsultationCancellationTemplate(patientName, consultationDate, consultationTime, reason, doctorName);
    
    const result = await sendEmail({
      to: patientEmail,
      subject: "❌ Consultation Cancelled - Dr. Mehmet",
      html: htmlContent,
      text: `Hello ${patientName}, your consultation with ${doctorName} on ${consultationDate} at ${consultationTime} has been cancelled. Reason: ${reason}. Please contact us if you need to reschedule.`
    });
    
    console.log('Consultation cancellation email sent successfully');
    return result;
    
  } catch (error) {
    console.error('Failed to send consultation cancellation email:', error);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  try {
    console.log('Testing email service connection...');
    console.log('API configuration:', {
      url: API_URL,
      apiKey: API_KEY
    });
    
    // Send a test email to verify the API is working
    const testResult = await sendEmail({
      to: 'test@example.com',
      subject: '🔧 Test Email - Implanner Email Service',
      html: '<h1>Test Email</h1><p>This is a test email to verify the API connection.</p>',
      text: 'This is a test email to verify the API connection.'
    });
    
    console.log('Email service connection verified successfully');
    return { success: true, message: 'Email service connection verified successfully', testResult };
  } catch (error) {
    console.error('Email service connection failed:', error);
    return { 
      success: false, 
      message: `Email service connection failed: ${error.message}`,
      error: error
    };
  }
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendConsultationCancellationEmail,
  testConnection,
  sendTestEmail: sendEmail,
  generateNumericVerificationCode,
  createVerificationEmailTemplate,
};
