const twilio = require('twilio');

// Twilio credentials from your .env file
const accountSid = 'AC6a343ab8ac71d0b20041a7b4108c865e';
const authToken = '3eeb247e1711e1e11d95280d11450d3e';
const fromNumber = '+12542723547';
const toNumber = '+923196117600';

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function testTwilioSMS() {
  try {
    console.log('🧪 Testing Twilio SMS...');
    console.log('📱 From:', fromNumber);
    console.log('📱 To:', toNumber);
    
    // Generate test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Test OTP:', testOTP);
    
    // Send SMS
    const message = await client.messages.create({
      body: `Your Ilaaj AI verification code is: ${testOTP}. This code will expire in 5 minutes.`,
      from: fromNumber,
      to: toNumber
    });
    
    console.log('✅ SMS sent successfully!');
    console.log('📱 Message SID:', message.sid);
    console.log('📱 Message Status:', message.status);
    console.log('📱 Message Direction:', message.direction);
    console.log('📱 Message Price:', message.price);
    console.log('📱 Message Price Unit:', message.priceUnit);
    
  } catch (error) {
    console.error('❌ Twilio SMS test failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('More Info:', error.moreInfo);
    console.error('Status:', error.status);
    console.error('Full Error:', error);
  }
}

async function testTwilioAccount() {
  try {
    console.log('🧪 Testing Twilio Account...');
    
    // Test account connection
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Twilio account connection successful!');
    console.log('📱 Account SID:', account.sid);
    console.log('📱 Account Name:', account.friendlyName);
    console.log('📱 Account Status:', account.status);
    console.log('📱 Account Type:', account.type);
    
  } catch (error) {
    console.error('❌ Twilio account test failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('More Info:', error.moreInfo);
    console.error('Status:', error.status);
  }
}

async function runTests() {
  console.log('🚀 Starting Twilio Tests...');
  console.log('================================');
  
  // Test 1: Account Connection
  await testTwilioAccount();
  
  console.log('\n================================');
  
  // Test 2: SMS Sending
  await testTwilioSMS();
  
  console.log('\n================================');
  console.log('🏁 Tests completed!');
}

// Run the tests
runTests();
