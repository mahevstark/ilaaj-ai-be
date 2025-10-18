const twilio = require('twilio');

// CORRECT credentials from your Twilio Console
const accountSid = 'ACe922c1008757bb8286db5c11b2be072c';
const authToken = '9c2b511dc8ce3f02ce911b21acc563c4';
const fromNumber = '+15674065431';
const toNumber = '+923196117600';

console.log('🔧 Testing with FINAL Correct Credentials');
console.log('================================');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken);
console.log('From Number:', fromNumber);
console.log('To Number:', toNumber);
console.log('================================\n');

async function testAccountConnection() {
  try {
    console.log('🧪 Testing Account Connection...');
    
    const client = twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Account Connection: SUCCESS!');
    console.log('📱 Account Name:', account.friendlyName);
    console.log('📱 Account Status:', account.status);
    console.log('📱 Account Type:', account.type);
    
    return true;
  } catch (error) {
    console.error('❌ Account Connection Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status:', error.status);
    return false;
  }
}

async function testSMS() {
  try {
    console.log('\n🧪 Testing SMS to +923196117600...');
    
    const client = twilio(accountSid, authToken);
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('🔐 Test OTP:', testOTP);
    console.log('📱 Sending SMS...');
    
    const message = await client.messages.create({
      body: `Your Ilaaj AI verification code is: ${testOTP}. This code will expire in 5 minutes.`,
      from: fromNumber,
      to: toNumber
    });
    
    console.log('✅ SMS SENT SUCCESSFULLY!');
    console.log('📱 Message SID:', message.sid);
    console.log('📱 Status:', message.status);
    console.log('📱 Direction:', message.direction);
    console.log('📱 Price:', message.price);
    console.log('📱 Price Unit:', message.priceUnit);
    
    return true;
  } catch (error) {
    console.error('❌ SMS Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('More Info:', error.moreInfo);
    
    if (error.code === 21614) {
      console.error('\n💡 Trial Account Restriction:');
      console.error('Trial accounts can only send SMS to verified numbers');
      console.error('Go to Twilio Console > Phone Numbers > Verified Caller IDs');
      console.error('Add +923196117600 to verified numbers');
    } else if (error.code === 21211) {
      console.error('\n💡 Invalid Phone Number:');
      console.error('The phone number format might be invalid');
    }
    
    return false;
  }
}

async function runFinalTest() {
  console.log('🚀 Starting Final Test with Correct Credentials...\n');
  
  const accountTest = await testAccountConnection();
  
  if (accountTest) {
    await testSMS();
  }
  
  console.log('\n================================');
  console.log('🏁 Final test completed!');
}

runFinalTest();
