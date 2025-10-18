const twilio = require('twilio');

// Your credentials
const accountSid = 'AC6a343ab8ac71d0b20041a7b4108c865e';
const authToken = '3eeb247e1711e1e11d95280d11450d3e';
const fromNumber = '+12542723547';
const toNumber = '+923196117600';

console.log('🔧 Detailed Twilio Test');
console.log('================================');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken);
console.log('From Number:', fromNumber);
console.log('To Number:', toNumber);
console.log('================================\n');

async function testAccountStatus() {
  try {
    console.log('🧪 Testing Account Status...');
    
    const client = twilio(accountSid, authToken);
    
    // Try to fetch account info
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Account Status: ACTIVE');
    console.log('📱 Account Name:', account.friendlyName);
    console.log('📱 Account Type:', account.type);
    console.log('📱 Account Status:', account.status);
    console.log('📱 Subresource URIs:', account.subresourceUris);
    
    return true;
  } catch (error) {
    console.error('❌ Account Status Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status Code:', error.status);
    console.error('More Info:', error.moreInfo);
    
    if (error.code === 20003) {
      console.error('\n💡 Error 20003 - Authentication Failed:');
      console.error('1. Check if Account SID is correct');
      console.error('2. Check if Auth Token is correct');
      console.error('3. Auth Token might have been regenerated');
      console.error('4. Account might be suspended');
    }
    
    return false;
  }
}

async function testPhoneNumberVerification() {
  try {
    console.log('\n🧪 Testing Phone Number Verification...');
    
    const client = twilio(accountSid, authToken);
    
    // Check if the phone number is verified (for trial accounts)
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list();
    console.log('📱 Available Phone Numbers:', incomingPhoneNumbers.length);
    
    if (incomingPhoneNumbers.length > 0) {
      console.log('📱 Phone Numbers:');
      incomingPhoneNumbers.forEach(phone => {
        console.log(`  - ${phone.phoneNumber} (${phone.friendlyName})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Phone Number Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    return false;
  }
}

async function testSMSWithDetailedError() {
  try {
    console.log('\n🧪 Testing SMS Sending...');
    
    const client = twilio(accountSid, authToken);
    
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Test OTP:', testOTP);
    
    const message = await client.messages.create({
      body: `Your Ilaaj AI verification code is: ${testOTP}. This code will expire in 5 minutes.`,
      from: fromNumber,
      to: toNumber
    });
    
    console.log('✅ SMS Sent Successfully!');
    console.log('📱 Message SID:', message.sid);
    console.log('📱 Status:', message.status);
    console.log('📱 Direction:', message.direction);
    console.log('📱 Price:', message.price);
    console.log('📱 Price Unit:', message.priceUnit);
    
    return true;
  } catch (error) {
    console.error('❌ SMS Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status Code:', error.status);
    console.error('More Info:', error.moreInfo);
    
    if (error.code === 21211) {
      console.error('\n💡 Error 21211 - Invalid Phone Number:');
      console.error('The phone number format is invalid');
      console.error('Expected format: +1234567890');
    } else if (error.code === 21614) {
      console.error('\n💡 Error 21614 - Unverified Phone Number:');
      console.error('Trial accounts can only send SMS to verified numbers');
      console.error('Go to Twilio Console > Phone Numbers > Manage > Verified Caller IDs');
    } else if (error.code === 20003) {
      console.error('\n💡 Error 20003 - Authentication Failed:');
      console.error('Invalid credentials or account issues');
    }
    
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Twilio Tests...\n');
  
  const accountTest = await testAccountStatus();
  
  if (accountTest) {
    await testPhoneNumberVerification();
    await testSMSWithDetailedError();
  } else {
    console.log('\n❌ Cannot proceed with other tests due to authentication failure');
  }
  
  console.log('\n================================');
  console.log('🏁 All tests completed!');
  console.log('\n💡 If all tests failed:');
  console.log('1. Check Twilio Console for correct credentials');
  console.log('2. Regenerate Auth Token if needed');
  console.log('3. Verify account is not suspended');
  console.log('4. For trial accounts: verify phone numbers first');
}

runAllTests();
