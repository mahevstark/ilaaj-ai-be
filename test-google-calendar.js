require('dotenv').config();
const { GoogleCalendarService } = require('./utils/google-calendar');

async function testGoogleCalendar() {
    console.log('🧪 Testing Google Calendar Integration...\n');
    
    // Check if environment variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
        console.error('❌ Error: Google Calendar credentials not found in .env file');
        console.log('Please add the following to your .env file:');
        console.log('GOOGLE_CLIENT_ID=700924869502-jarrmle4ccigkd0u1p2i7pdlpeaojp1k.apps.googleusercontent.com');
        console.log('GOOGLE_CLIENT_SECRET=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');
        console.log('GOOGLE_REFRESH_TOKEN=your_refresh_token_from_oauth_flow');
        console.log('GOOGLE_CALENDAR_ID=primary');
        return;
    }

    console.log('✅ Google Calendar credentials found');
    console.log(`📅 Calendar ID: ${process.env.GOOGLE_CALENDAR_ID || 'primary'}`);
    console.log(`🔑 Client ID: ${process.env.GOOGLE_CLIENT_ID}\n`);

    try {
        const calendarService = new GoogleCalendarService();
        
        // Test 1: Get available slots for next 7 days
        console.log('1. Testing available slots...');
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);
        
        const availableSlots = await calendarService.getAvailableSlots(
            startDate.toISOString(),
            endDate.toISOString(),
            60 // 60 minutes duration
        );
        
        console.log(`✅ Found ${availableSlots.length} available slots`);
        if (availableSlots.length > 0) {
            console.log('Sample slots:');
            availableSlots.slice(0, 3).forEach((slot, index) => {
                console.log(`  ${index + 1}. ${new Date(slot.start).toLocaleString()} - ${new Date(slot.end).toLocaleString()}`);
            });
        }

        // Test 2: Check calendar access
        console.log('\n2. Testing calendar access...');
        const events = await calendarService.getEvents(
            startDate.toISOString(),
            endDate.toISOString()
        );
        console.log(`✅ Successfully accessed calendar with ${events.length} events`);

        console.log('\n🎉 Google Calendar integration is working perfectly!');
        console.log('\n📝 Next steps:');
        console.log('1. Start your backend server: npm start');
        console.log('2. Start your frontend: npm run dev');
        console.log('3. Test the booking flow in your application');

    } catch (error) {
        console.error('❌ Error testing Google Calendar:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure your .env file has all required Google Calendar variables');
        console.log('2. Verify the refresh token is valid and not expired');
        console.log('3. Check that Google Calendar API is enabled in your Google Cloud Console');
    }
}

testGoogleCalendar().catch(console.error);
