const { google } = require('googleapis');
const readline = require('readline');

// Google OAuth credentials from Google Cloud Console
const CLIENT_ID = '700924869502-jarrmle4ccigkd0u1p2i7pdlpeaojp1k.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:5173';

// Scopes required for Google Calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // This ensures we get a refresh token
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Tokens received:', tokens);
        console.log('\n=== IMPORTANT ===');
        console.log('Add this to your .env file:');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('==================');
        
        // Test the token by getting calendar info
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        try {
            const calendarList = await calendar.calendarList.list();
            console.log('\n✅ Successfully connected to Google Calendar!');
            console.log('Available calendars:', calendarList.data.items.map(cal => cal.summary));
        } catch (error) {
            console.log('❌ Error accessing calendar:', error.message);
        }
        
    } catch (error) {
        console.error('Error retrieving access token:', error);
    }
    
    rl.close();
});
