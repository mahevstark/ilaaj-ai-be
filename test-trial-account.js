const twilio = require('twilio');

// Correct credentials from Twilio Console
const accountSid = 'ACe922c1008757bb8286db5c11b2be072';
const authToken = '9c2b511dc8ce3f02ce911b21acc563c4';
const fromNumber = '+15674065431';
const toNumber = '+923196117600';

console.log('🔧 Testing Trial Account Restrictions');
console.log('================================');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken);
console.log('From Number:', fromNumber);
console.log('To Number:', toNumber);
console.log('================================\n');

async function testTrialAccountLimitations() {
  try {
    console.log('🧪 Testing Trial Account Access...');
    
    const client = twilio(accountSid, authToken);
    
    // Try to get account info
    const account = await client.api.accounts(accountSid).fetch();
    console.log('✅ Account Access: SUCCESS!');
    console.log('📱 Account Name:', account.friendlyName);
    console.log('📱 Account Status:', account.status);
    console.log('📱 Account Type:', account.type);
    
    // Check if it's a trial account
    if (account.type === 'Trial') {
      console.log('\n⚠️  TRIAL ACCOUNT DETECTED!');
      console.log('Trial accounts have restrictions:');
      console.log('- Can only send SMS to verified numbers');
      console.log('- Limited to specific countries');
      console.log('- Need to verify phone numbers first');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Trial Account Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status:', error.status);
    
    if (error.code === 20003) {
      console.error('\n💡 Authentication Error - Possible Issues:');
      console.error('1. Credentials might be wrong');
      console.error('2. Account might be suspended');
      console.error('3. API access might be restricted');
    }
    
    return false;
  }
}

async function testVerifiedNumbers() {
  try {
    console.log('\n🧪 Checking Verified Phone Numbers...');
    
    const client = twilio(accountSid, authToken);
    
    // Get verified caller IDs
    const verifiedNumbers = await client.outgoingCallerIds.list();
    
    console.log('📱 Verified Numbers:', verifiedNumbers.length);
    
    if (verifiedNumbers.length > 0) {
      console.log('📱 Verified Numbers List:');
      verifiedNumbers.forEach(number => {
        console.log(`  - ${number.phoneNumber} (${number.friendlyName})`);
      });
      
      // Check if our target number is verified
      const isVerified = verifiedNumbers.some(num => num.phoneNumber === toNumber);
      console.log(`\n🎯 Target Number ${toNumber} is verified:`, isVerified);
      
      if (!isVerified) {
        console.log('\n⚠️  TRIAL ACCOUNT RESTRICTION:');
        console.log(`You need to verify ${toNumber} first!`);
        console.log('Go to Twilio Console > Phone Numbers > Verified Caller IDs');
        console.log('Add the phone number and verify it via SMS');
      }
    } else {
      console.log('\n⚠️  NO VERIFIED NUMBERS FOUND!');
      console.log('Trial accounts require verified numbers to send SMS');
      console.log('Go to Twilio Console > Phone Numbers > Verified Caller IDs');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Verified Numbers Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    return false;
  }
}

async function testSMSWithTrialRestrictions() {
  try {
    console.log('\n🧪 Testing SMS with Trial Restrictions...');
    
    const client = twilio(accountSid, authToken);
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('🔐 Test OTP:', testOTP);
    console.log('📱 Attempting to send SMS...');
    
    const message = await client.messages.create({
      body: `Your Ilaaj AI verification code is: ${testOTP}. This code will expire in 5 minutes.`,
      from: fromNumber,
      to: toNumber
    });
    
    console.log('✅ SMS SENT SUCCESSFULLY!');
    console.log('📱 Message SID:', message.sid);
    console.log('📱 Status:', message.status);
    
    return true;
  } catch (error) {
    console.error('❌ SMS Test Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 21614) {
      console.error('\n🚫 TRIAL ACCOUNT RESTRICTION:');
      console.error('Error 21614: Cannot send SMS to unverified number');
      console.error(`You need to verify ${toNumber} first!`);
      console.error('\n📋 Steps to fix:');
      console.error('1. Go to Twilio Console');
      console.error('2. Navigate to Phone Numbers > Verified Caller IDs');
      console.error('3. Add +923196117600');
      console.error('4. Verify via SMS');
      console.error('5. Then try sending OTP again');
    }
    
    return false;
  }
}

async function runTrialTest() {
  console.log('🚀 Testing Trial Account Limitations...\n');
  
  const accountTest = await testTrialAccountLimitations();
  
  if (accountTest) {
    await testVerifiedNumbers();
    await testSMSWithTrialRestrictions();
  }
  
  console.log('\n================================');
  console.log('🏁 Trial account test completed!');
}

runTrialTest();
