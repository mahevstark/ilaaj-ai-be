# Google OAuth Verification Guide

## Current Issue
Your Google OAuth app is showing "Error 403: access_denied" because it hasn't completed Google's verification process.

## Quick Fix: Add Test Users

### Step 1: Go to OAuth Consent Screen
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `implanner-472909`
3. Navigate to **APIs & Services** → **OAuth consent screen**

### Step 2: Add Test Users
1. Scroll down to **"Test users"** section
2. Click **"Add users"**
3. Add these email addresses:
   - `implannercom@gmail.com` (your current account)
   - Any other Google accounts you want to test with
4. Click **"Save"**

### Step 3: Test the OAuth Flow
1. Go back to your terminal
2. Run the OAuth script again
3. Try the OAuth flow with the added test user

## Alternative: Publish the App

### Step 1: Go to OAuth Consent Screen
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `implanner-472909`
3. Navigate to **APIs & Services** → **OAuth consent screen**

### Step 2: Publish the App
1. Look for **"Publish app"** button
2. Click it to make the app available to all users
3. Note: This may require additional verification steps

## What This Fixes
- Removes the "access_denied" error
- Allows OAuth flow to complete
- Enables you to get the refresh token
- Makes Google Calendar integration work

## Next Steps After Fix
1. Complete the OAuth flow
2. Get your refresh token
3. Add it to your .env file
4. Test the Google Calendar integration
