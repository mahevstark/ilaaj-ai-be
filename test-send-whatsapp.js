require('dotenv').config();
const { sendWhatsAppOTP, sendWhatsAppMessage } = require('./utils/whatsapp');

async function testSendWhatsApp() {
    console.log('🚀 Testing WhatsApp message to +923104286698...\n');
    
    // Check if environment variables are set
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.error('❌ Error: Twilio credentials not found in .env file');
        console.log('Please add the following to your .env file:');
        console.log('TWILIO_ACCOUNT_SID="your-account-sid"');
        console.log('TWILIO_AUTH_TOKEN="your-auth-token"');
        console.log('TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"');
        return;
    }
    
    console.log('✅ Twilio credentials found');
    console.log(`📱 Sending to: +923104286698`);
    console.log(`📤 From: ${process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'}`);
    console.log(`🔑 Sandbox code: fastened-subject`);
    console.log(`📝 Note: The recipient (+923104286698) needs to join the sandbox first by sending "join fastened-subject" to +1 415 523 8886\n`);
    
    try {
        // Test 1: Send a simple message
        console.log('1. Sending test message...');
        const messageResult = await sendWhatsAppMessage('+923104286698', 
            '🧪 Test Message from Implanner!\n\nThis is a test message to verify WhatsApp integration is working correctly.\n\nBest regards,\nImplanner Team'
        );
        console.log('✅ Message sent successfully:', messageResult);
        
        // Test 2: Send OTP message
        console.log('\n2. Sending OTP message...');
        const otpResult = await sendWhatsAppOTP('+923104286698', 'Test User', '123456');
        console.log('✅ OTP sent successfully:', otpResult);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📝 Note: The recipient (+923104286698) needs to join the WhatsApp sandbox first.');
        console.log('   They should send "join <sandbox-code>" to the sandbox number.');
        console.log('   Check your Twilio console for the exact sandbox code.');
        
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.message);
        
        if (error.message.includes('not a valid WhatsApp number')) {
            console.log('\n💡 This usually means:');
            console.log('   1. The number +923196117600 hasn\'t joined the WhatsApp sandbox yet');
            console.log('   2. The recipient needs to send "join <sandbox-code>" to the sandbox number');
            console.log('   3. Check your Twilio console for the sandbox setup instructions');
        } else if (error.message.includes('Authentication')) {
            console.log('\n💡 This usually means:');
            console.log('   1. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
            console.log('   2. Make sure they are correct in your .env file');
        }
    }
}

// Run the test
testSendWhatsApp().catch(console.error);
