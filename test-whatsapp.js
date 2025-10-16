const { sendWhatsAppOTP, sendWhatsAppWelcome, validatePhoneNumber, formatPhoneNumber } = require('./utils/whatsapp');

// Test script for WhatsApp integration
async function testWhatsAppIntegration() {
    console.log('🧪 Testing WhatsApp Integration...\n');
    
    // Test phone number validation
    console.log('1. Testing phone number validation:');
    const testNumbers = [
        '+1234567890',
        '1234567890',
        '+44123456789',
        'invalid',
        '123',
        '+123456789012345'
    ];
    
    testNumbers.forEach(number => {
        const isValid = validatePhoneNumber(number);
        const formatted = formatPhoneNumber(number);
        console.log(`   ${number} -> Valid: ${isValid}, Formatted: ${formatted}`);
    });
    
    console.log('\n2. Testing WhatsApp message sending (requires valid Twilio credentials):');
    
    // Test WhatsApp OTP (uncomment to test with real credentials)
    /*
    try {
        const otpResult = await sendWhatsAppOTP('+1234567890', 'Test User', '123456');
        console.log('   WhatsApp OTP sent:', otpResult);
    } catch (error) {
        console.log('   WhatsApp OTP error:', error.message);
    }
    */
    
    // Test WhatsApp Welcome (uncomment to test with real credentials)
    /*
    try {
        const welcomeResult = await sendWhatsAppWelcome('+1234567890', 'Test User');
        console.log('   WhatsApp Welcome sent:', welcomeResult);
    } catch (error) {
        console.log('   WhatsApp Welcome error:', error.message);
    }
    */
    
    console.log('\n✅ WhatsApp integration test completed!');
    console.log('\n📝 To test with real messages:');
    console.log('   1. Set up Twilio credentials in .env file');
    console.log('   2. Uncomment the test code above');
    console.log('   3. Run: node test-whatsapp.js');
}

// Run the test
testWhatsAppIntegration().catch(console.error);
