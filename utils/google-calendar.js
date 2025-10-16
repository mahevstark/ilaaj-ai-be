const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleCalendarService {
    constructor() {
        this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback'
        );
        
        // Set credentials if available
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
        }
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    // Get authorization URL for OAuth flow
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    // Exchange authorization code for tokens
    async getTokens(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw error;
        }
    }

    // Set credentials for API calls
    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    // Get available time slots for a specific date range
    async getAvailableSlots(startDate, endDate, durationMinutes = 60) {
        try {
            const timeMin = new Date(startDate).toISOString();
            const timeMax = new Date(endDate).toISOString();

            const response = await this.calendar.freebusy.query({
                resource: {
                    timeMin,
                    timeMax,
                    items: [{ id: this.calendarId }]
                }
            });

            const busyTimes = response.data.calendars[this.calendarId]?.busy || [];
            
            // Generate available slots
            const availableSlots = this.generateAvailableSlots(
                startDate, 
                endDate, 
                busyTimes, 
                durationMinutes
            );

            return availableSlots;
        } catch (error) {
            console.error('Error getting available slots:', error);
            throw error;
        }
    }

    // Generate available time slots
    generateAvailableSlots(startDate, endDate, busyTimes, durationMinutes) {
        const slots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Dr. Mehmet's working hours (11 AM to 6 PM Turkey time)
        const workingHours = {
            start: 11, // 11 AM
            end: 18    // 6 PM
        };

        // Generate slots for each day
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const daySlots = this.generateDaySlots(date, busyTimes, durationMinutes, workingHours);
            slots.push(...daySlots);
        }

        return slots;
    }

    // Generate slots for a specific day
    generateDaySlots(date, busyTimes, durationMinutes, workingHours) {
        const slots = [];
        const dayStart = new Date(date);
        dayStart.setHours(workingHours.start, 0, 0, 0);
        
        const dayEnd = new Date(date);
        dayEnd.setHours(workingHours.end, 0, 0, 0);

        // Generate 30-minute slots
        for (let time = new Date(dayStart); time < dayEnd; time.setMinutes(time.getMinutes() + 30)) {
            const slotEnd = new Date(time);
            slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

            // Check if this slot conflicts with busy times
            const isAvailable = !this.isSlotBusy(time, slotEnd, busyTimes);
            
            if (isAvailable) {
                slots.push({
                    start: new Date(time),
                    end: new Date(slotEnd),
                    available: true
                });
            }
        }

        return slots;
    }

    // Check if a time slot conflicts with busy times
    isSlotBusy(slotStart, slotEnd, busyTimes) {
        return busyTimes.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            
            return (slotStart < busyEnd && slotEnd > busyStart);
        });
    }

    // Create a calendar event (consultation booking)
    async createConsultationEvent(bookingData) {
        try {
            const {
                patientName,
                patientEmail,
                patientPhone,
                startTime,
                endTime,
                consultationType = 'Second Opinion',
                notes = '',
                treatmentPlanId
            } = bookingData;

            // Convert times to Turkey timezone (GMT+3)
            // The input times should be in Turkey timezone, but we need to ensure
            // they're properly formatted for Google Calendar
            const startDateTime = new Date(startTime);
            const endDateTime = new Date(endTime);
            
            // Log the times for debugging
            console.log('Creating calendar event with times:');
            console.log('Start time (input):', startTime);
            console.log('End time (input):', endTime);
            console.log('Start time (parsed):', startDateTime.toISOString());
            console.log('End time (parsed):', endDateTime.toISOString());
            console.log('Start time (Turkey):', startDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
            console.log('End time (Turkey):', endDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

            const event = {
                summary: `Consultation with Dr. Mehmet - ${patientName}`,
                description: `
Patient: ${patientName}
Email: ${patientEmail}
Phone: ${patientPhone}
Consultation Type: ${consultationType}
Treatment Plan ID: ${treatmentPlanId || 'N/A'}

Notes: ${notes}

This is a consultation booking from Implaner platform.
                `.trim(),
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'Europe/Istanbul'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'Europe/Istanbul'
                },
                attendees: [
                    {
                        email: patientEmail,
                        displayName: patientName,
                        responseStatus: 'accepted'
                    }
                ],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 24 hours before
                        { method: 'popup', minutes: 60 }       // 1 hour before
                    ]
                },
                conferenceData: {
                    createRequest: {
                        requestId: `consultation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet'
                        }
                    }
                },
                visibility: 'private',
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                guestsCanSeeOtherGuests: false
            };

            const response = await this.calendar.events.insert({
                calendarId: this.calendarId,
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all'
            });

            return {
                success: true,
                eventId: response.data.id,
                event: response.data,
                meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri
            };
        } catch (error) {
            console.error('Error creating consultation event:', error);
            throw error;
        }
    }

    // Get event by ID
    async getEvent(eventId) {
        try {
            const response = await this.calendar.events.get({
                calendarId: this.calendarId,
                eventId: eventId
            });
            return response.data;
        } catch (error) {
            console.error('Error getting event:', error);
            throw error;
        }
    }

    // Update event
    async updateEvent(eventId, updateData) {
        try {
            const response = await this.calendar.events.update({
                calendarId: this.calendarId,
                eventId: eventId,
                resource: updateData
            });
            return response.data;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }

    // Delete event
    async deleteEvent(eventId) {
        try {
            await this.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId
            });
            return { success: true };
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    // Check if a specific time slot is available
    async isTimeSlotAvailable(startTime, endTime) {
        try {
            const response = await this.calendar.freebusy.query({
                resource: {
                    timeMin: new Date(startTime).toISOString(),
                    timeMax: new Date(endTime).toISOString(),
                    items: [{ id: this.calendarId }]
                }
            });

            const busyTimes = response.data.calendars[this.calendarId]?.busy || [];
            return busyTimes.length === 0;
        } catch (error) {
            console.error('Error checking time slot availability:', error);
            throw error;
        }
    }

    // Get calendar events for a date range
    async getEvents(startDate, endDate) {
        try {
            const response = await this.calendar.events.list({
                calendarId: this.calendarId,
                timeMin: new Date(startDate).toISOString(),
                timeMax: new Date(endDate).toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Error getting events:', error);
            throw error;
        }
    }
}

module.exports = { GoogleCalendarService };
