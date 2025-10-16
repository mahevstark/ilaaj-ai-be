const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// WhatsApp Business API phone number (from Twilio Console)
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Sandbox number for testing

/**
 * Send WhatsApp message
 * @param {string} to - Recipient phone number (with country code, e.g., +1234567890)
 * @param {string} message - Message content
 * @returns {Promise<Object>} Twilio message response
 */
const sendWhatsAppMessage = async (to, message) => {
    try {
        // Ensure phone number has proper format
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        
        console.log(`Sending WhatsApp message to: ${formattedTo}`);
        console.log(`Message: ${message}`);
        
        const response = await client.messages.create({
            from: WHATSAPP_FROM,
            to: formattedTo,
            body: message
        });
        
        console.log('WhatsApp message sent successfully:', response.sid);
        return {
            success: true,
            messageSid: response.sid,
            status: response.status,
            to: formattedTo
        };
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
};

/**
 * Send OTP via WhatsApp
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} name - Recipient name
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppOTP = async (phoneNumber, name, code) => {
    const message = `🔐 Implanner Verification Code

Hello ${name || 'User'}!

Your verification code is: *${code}*

This code will expire in 24 hours.

If you didn't request this code, please ignore this message.

Best regards,
Implanner Team`;

    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send welcome message via WhatsApp
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} name - Recipient name
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppWelcome = async (phoneNumber, name) => {
    const message = `🎉 Welcome to Implanner!

Hello ${name || 'User'}!

Thank you for joining Implanner! Your account has been successfully verified.

You can now:
• Upload your X-ray for analysis
• Get personalized treatment plans
• Find nearby dental clinics
• Book consultations with experts

Need help? Just reply to this message!

Best regards,
Implanner Team`;

    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send password reset code via WhatsApp
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} name - Recipient name
 * @param {string} code - 6-digit reset code
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppPasswordReset = async (phoneNumber, name, code) => {
    const message = `🔑 Implanner Password Reset

Hello ${name || 'User'}!

Your password reset code is: *${code}*

This code will expire in 1 hour.

If you didn't request this reset, please ignore this message.

Best regards,
Implanner Team`;

    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send appointment reminder via WhatsApp
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} name - Recipient name
 * @param {Object} appointment - Appointment details
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppAppointmentReminder = async (phoneNumber, name, appointment) => {
    const message = `📅 Appointment Reminder

Hello ${name || 'User'}!

This is a reminder about your upcoming appointment:

📅 Date: ${appointment.date}
🕐 Time: ${appointment.time}
📍 Location: ${appointment.location}
👨‍⚕️ Doctor: ${appointment.doctor}

Please arrive 15 minutes early.

Need to reschedule? Reply to this message!

Best regards,
Implanner Team`;

    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send treatment plan notification via WhatsApp
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} name - Recipient name
 * @param {Object} plan - Treatment plan details
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppTreatmentPlan = async (phoneNumber, name, plan) => {
    const message = `🦷 Your Treatment Plan is Ready!

Hello ${name || 'User'}!

Your personalized treatment plan has been generated:

📋 Treatment: ${plan.title || 'Dental Treatment Plan'}
💰 Estimated Cost: $${plan.estimatedCost || 'TBD'}
⏱️ Duration: ${plan.duration || 'TBD'}

View your complete plan in the Implanner app.

Questions? Reply to this message!

Best regards,
Implanner Team`;

    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Is valid format
 */
const validatePhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (7-15 digits)
    return cleaned.length >= 7 && cleaned.length <= 15;
};

/**
 * Format phone number for WhatsApp
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assume US if no country code)
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    } else if (cleaned.length > 11) {
        return `+${cleaned}`;
    }
    
    return phoneNumber; // Return as-is if can't determine format
};

module.exports = {
    sendWhatsAppMessage,
    sendWhatsAppOTP,
    sendWhatsAppWelcome,
    sendWhatsAppPasswordReset,
    sendWhatsAppAppointmentReminder,
    sendWhatsAppTreatmentPlan,
    validatePhoneNumber,
    formatPhoneNumber
};
