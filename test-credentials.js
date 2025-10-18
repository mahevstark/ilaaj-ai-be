// Test script to verify Twilio credentials format and validity

console.log('🔧 Testing Twilio Credentials...');
console.log('================================');

// Your provided credentials
const accountSid = 'AC6a343ab8ac71d0b20041a7b4108c865e';
const authToken = '3eeb247e1711e1e11d95280d11450d3e';

console.log('📱 Account SID:', accountSid);
console.log('📱 Auth Token:', authToken);
console.log('📱 SID Length:', accountSid.length);
console.log('📱 Token Length:', authToken.length);

// Check if credentials match expected format
console.log('\n🔍 Credential Validation:');
console.log('SID starts with AC:', accountSid.startsWith('AC'));
console.log('SID length is 34:', accountSid.length === 34);
console.log('Token is 32 chars:', authToken.length === 32);
console.log('Token is alphanumeric:', /^[a-zA-Z0-9]+$/.test(authToken));

// Test with different credential formats
console.log('\n🧪 Testing different credential combinations...');

// Test 1: Original credentials
console.log('\nTest 1: Original credentials');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken);

// Test 2: Check if there are any hidden characters
console.log('\nTest 2: Checking for hidden characters');
console.log('SID bytes:', Buffer.from(accountSid).toString('hex'));
console.log('Token bytes:', Buffer.from(authToken).toString('hex'));

// Test 3: Try with trimmed credentials
const trimmedSid = accountSid.trim();
const trimmedToken = authToken.trim();
console.log('\nTest 3: Trimmed credentials');
console.log('Trimmed SID:', trimmedSid);
console.log('Trimmed Token:', trimmedToken);

console.log('\n================================');
console.log('🏁 Credential analysis complete!');
console.log('\n💡 Common issues:');
console.log('1. Copy-paste errors (extra spaces, wrong characters)');
console.log('2. Credentials from wrong Twilio account');
console.log('3. Credentials expired or regenerated');
console.log('4. Account suspended or inactive');
console.log('\n🔧 Next steps:');
console.log('1. Double-check credentials in Twilio Console');
console.log('2. Regenerate Auth Token if needed');
console.log('3. Verify account is active');
console.log('4. Check if phone number is verified for trial accounts');
