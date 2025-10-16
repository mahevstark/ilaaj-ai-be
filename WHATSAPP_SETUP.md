# WhatsApp Integration Setup Guide

This guide explains how to set up WhatsApp integration using Twilio for sending OTP and other messages.

## Prerequisites

1. Twilio Account
2. WhatsApp Business API access (via Twilio)
3. Node.js backend with the required dependencies

## Twilio Setup

### 1. Create Twilio Account
- Go to [Twilio Console](https://console.twilio.com/)
- Sign up for a free account
- Verify your phone number

### 2. Get WhatsApp Sandbox (for testing)
- In Twilio Console, go to "Messaging" > "Try it out" > "Send a WhatsApp message"
- Follow the instructions to set up WhatsApp sandbox
- You'll get a sandbox number like `+14155238886`
- Users need to send a specific message to this number to join the sandbox

### 3. Get Production WhatsApp Business API (for production)
- Apply for WhatsApp Business API access through Twilio
- This requires business verification and approval
- Once approved, you'll get a dedicated WhatsApp Business number

## Environment Variables

Add these variables to your `.env` file:

```env
# Twilio Configuration for WhatsApp
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"  # Sandbox number for testing
```

### For Production:
```env
TWILIO_WHATSAPP_FROM="whatsapp:+1234567890"  # Your actual WhatsApp Business number
```

## Installation

The required dependencies are already installed:

```bash
npm install twilio
```

## Features Implemented

### 1. WhatsApp OTP
- Sends 6-digit verification codes via WhatsApp
- Automatic fallback to email if WhatsApp fails
- Phone number validation and formatting

### 2. WhatsApp Welcome Messages
- Sends welcome message after successful verification
- Includes app features and contact information

### 3. WhatsApp Password Reset
- Sends password reset codes via WhatsApp
- Secure and time-limited codes

### 4. Additional WhatsApp Features
- Appointment reminders
- Treatment plan notifications
- General messaging capabilities

## API Endpoints

### Send WhatsApp OTP
```
POST /api/auth/whatsapp/send-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp verification code sent successfully"
}
```

## Usage in Registration

When users select "WhatsApp" as their contact method during registration:

1. System validates phone number format
2. Sends OTP via WhatsApp instead of email
3. Falls back to email if WhatsApp fails
4. Sends welcome message via WhatsApp after verification

## Phone Number Format

The system automatically formats phone numbers:
- Adds country code if missing (assumes US +1 if 10 digits)
- Validates phone number length (7-15 digits)
- Formats for WhatsApp API

## Testing

### Sandbox Testing
1. Set up Twilio sandbox
2. Use sandbox number in `TWILIO_WHATSAPP_FROM`
3. Users send specific message to join sandbox
4. Test OTP sending functionality

### Production Testing
1. Get approved WhatsApp Business API
2. Use your business number in `TWILIO_WHATSAPP_FROM`
3. Test with real phone numbers

## Error Handling

The system includes comprehensive error handling:
- Phone number validation
- Twilio API error handling
- Automatic fallback to email
- Detailed error logging

## Security Considerations

- Phone numbers are validated before sending
- OTP codes are time-limited (24 hours)
- Rate limiting should be implemented
- Sensitive data is not logged

## Monitoring

Monitor WhatsApp delivery through:
- Twilio Console logs
- Application error logs
- Delivery status webhooks (optional)

## Troubleshooting

### Common Issues

1. **"Invalid phone number"**
   - Check phone number format
   - Ensure country code is included

2. **"WhatsApp message failed"**
   - Verify Twilio credentials
   - Check if user has joined sandbox (testing)
   - Verify WhatsApp Business API status (production)

3. **"User not found"**
   - Ensure user exists in database
   - Check if user selected WhatsApp as contact method

### Debug Steps

1. Check Twilio Console for message status
2. Verify environment variables
3. Test with known working phone numbers
4. Check application logs for detailed errors

## Cost Considerations

- Twilio charges per message sent
- WhatsApp Business API has additional costs
- Consider rate limiting to control costs
- Monitor usage in Twilio Console

## Future Enhancements

- Webhook handling for delivery status
- Message templates for different languages
- Rich media message support
- Conversation management
- Analytics and reporting
