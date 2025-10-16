const { PrismaClient } = require('../generated/prisma');
const { GoogleCalendarService } = require('../utils/google-calendar');
const { sendTestEmail } = require('../utils/email');

const prisma = new PrismaClient();
const calendarService = new GoogleCalendarService();

// Helper functions for date/time formatting
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Helper function to create proper Turkey timezone dates
const createTurkeyDate = (date, hour, minute) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Create date in Turkey timezone (GMT+3)
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
    return new Date(dateString);
};

// Get available time slots for consultation booking
const getAvailableSlots = async (req, res, next) => {
    try {
        const { startDate, endDate, duration = 60 } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Get available slots from Google Calendar
        const availableSlots = await calendarService.getAvailableSlots(
            startDate, 
            endDate, 
            parseInt(duration)
        );

        // Filter out slots that are already booked in our database
        const bookedConsultations = await prisma.consultation.findMany({
            where: {
                status: {
                    in: ['SCHEDULED', 'CONFIRMED']
                },
                scheduledAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            select: {
                scheduledAt: true,
                duration: true
            }
        });

        // Get unavailable slots
        const unavailableSlots = await prisma.unavailableSlot.findMany({
            where: {
                startTime: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            select: {
                startTime: true,
                endTime: true
            }
        });

        // Filter out booked and unavailable slots
        const filteredSlots = availableSlots.filter(slot => {
            const slotStart = new Date(slot.start);
            const slotEnd = new Date(slot.end);
            
            // Check for conflicts with booked consultations
            const hasBookingConflict = bookedConsultations.some(booking => {
                const bookingStart = new Date(booking.scheduledAt);
                const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);
                
                return (slotStart < bookingEnd && slotEnd > bookingStart);
            });

            // Check for conflicts with unavailable slots
            const hasUnavailableConflict = unavailableSlots.some(unavailable => {
                const unavailableStart = new Date(unavailable.startTime);
                const unavailableEnd = new Date(unavailable.endTime);
                
                return (slotStart < unavailableEnd && slotEnd > unavailableStart);
            });

            return !hasBookingConflict && !hasUnavailableConflict;
        });

        res.json({
            success: true,
            slots: filteredSlots,
            totalSlots: filteredSlots.length
        });
    } catch (error) {
        console.error('Error getting available slots:', error);
        next(error);
    }
};

// Check if a specific time slot is available
const checkSlotAvailability = async (req, res, next) => {
    try {
        const { startTime, endTime } = req.body;
        
        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'Start time and end time are required'
            });
        }

        // Check Google Calendar availability
        const isGoogleAvailable = await calendarService.isTimeSlotAvailable(startTime, endTime);
        
        // Check database for existing bookings
        const existingBooking = await prisma.consultation.findFirst({
            where: {
                status: {
                    in: ['SCHEDULED', 'CONFIRMED']
                },
                scheduledAt: {
                    gte: new Date(startTime),
                    lt: new Date(endTime)
                }
            }
        });

        const isAvailable = isGoogleAvailable && !existingBooking;

        res.json({
            success: true,
            available: isAvailable,
            reason: !isAvailable ? (existingBooking ? 'Slot already booked' : 'Slot not available in calendar') : null
        });
    } catch (error) {
        console.error('Error checking slot availability:', error);
        next(error);
    }
};

// Book a consultation
const bookConsultation = async (req, res, next) => {
    try {
        const {
            userId,
            treatmentPlanId,
            type = 'SECOND_OPINION',
            scheduledAt,
            duration = 60,
            patientName,
            patientEmail,
            patientPhone,
            patientNotes,
            agenda,
            userTimezone
        } = req.body;

        // Validate required fields
        if (!userId || !scheduledAt || !patientName || !patientEmail) {
            return res.status(400).json({
                success: false,
                message: 'User ID, scheduled time, patient name, and email are required'
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if treatment plan exists (if provided)
        if (treatmentPlanId) {
            const treatmentPlan = await prisma.treatmentPlan.findUnique({
                where: { id: parseInt(treatmentPlanId) }
            });

            if (!treatmentPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Treatment plan not found'
                });
            }
        }

        // Double-check slot availability
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000);
        const isAvailable = await calendarService.isTimeSlotAvailable(scheduledAt, endTime);
        
        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'Selected time slot is no longer available'
            });
        }

        // Check for existing booking in our database
        const existingBooking = await prisma.consultation.findFirst({
            where: {
                status: {
                    in: ['SCHEDULED', 'CONFIRMED']
                },
                scheduledAt: {
                    gte: new Date(scheduledAt),
                    lt: endTime
                }
            }
        });

        if (existingBooking) {
            return res.status(409).json({
                success: false,
                message: 'Selected time slot is already booked'
            });
        }

        // Create Google Calendar event
        // Convert scheduledAt to proper Turkey timezone format
        const scheduledDate = new Date(scheduledAt);
        const endDate = new Date(endTime);
        
        // Extract time components from the scheduled date
        const scheduledHour = scheduledDate.getHours();
        const scheduledMinute = scheduledDate.getMinutes();
        const scheduledDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
        
        // Create proper Turkey timezone dates
        const turkeyStartTime = createTurkeyDate(scheduledDay, scheduledHour, scheduledMinute);
        const turkeyEndTime = createTurkeyDate(scheduledDay, scheduledHour + 1, scheduledMinute); // Add duration
        
        console.log('Creating calendar event with:');
        console.log('Original scheduledAt:', scheduledAt);
        console.log('Original endTime:', endTime);
        console.log('Turkey start time:', turkeyStartTime.toISOString());
        console.log('Turkey end time:', turkeyEndTime.toISOString());
        console.log('Start time (Turkey display):', turkeyStartTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        console.log('End time (Turkey display):', turkeyEndTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        
        const calendarEvent = await calendarService.createConsultationEvent({
            patientName,
            patientEmail,
            patientPhone,
            startTime: turkeyStartTime.toISOString(),
            endTime: turkeyEndTime.toISOString(),
            consultationType: type,
            notes: patientNotes,
            treatmentPlanId
        });

        if (!calendarEvent.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create calendar event'
            });
        }

        // Create consultation record in database
        const consultation = await prisma.consultation.create({
            data: {
                userId: parseInt(userId),
                treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                type,
                status: 'SCHEDULED',
                scheduledAt: new Date(scheduledAt),
                duration,
                patientName,
                patientEmail,
                patientPhone,
                patientNotes,
                agenda,
                googleEventId: calendarEvent.eventId,
                meetingLink: calendarEvent.meetingLink,
                calendarUrl: calendarEvent.event.htmlLink
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true
                    }
                }
            }
        });

        // Send confirmation email to patient
        try {
            // Use the user's timezone from the request, or fallback to a default
            const userTimezoneToUse = userTimezone || 'America/New_York';
            const turkeyTime = new Date(scheduledAt);
            
            // Create proper timezone conversion
            // The scheduledAt should be in Turkey timezone, so we need to convert it properly
            const turkeyTimeFormatted = turkeyTime.toLocaleString('en-US', { 
                timeZone: 'Europe/Istanbul',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            const userLocalTimeFormatted = turkeyTime.toLocaleString('en-US', { 
                timeZone: userTimezoneToUse,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            console.log('User timezone:', userTimezoneToUse);
            console.log('Turkey time (original):', turkeyTime.toISOString());
            console.log('Turkey time (formatted):', turkeyTimeFormatted);
            console.log('User local time (formatted):', userLocalTimeFormatted);
            
            const patientEmailSubject = `Consultation Confirmed - ${formatDate(new Date(scheduledAt))}`;
            const patientEmailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #328DFF, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📅 Consultation Confirmed!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your consultation with Dr. Mehmet has been scheduled</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Appointment Details</h2>
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Date & Time (Turkey):</span>
                                    <span style="color: #1e293b;">${turkeyTimeFormatted} (Turkey Time, GMT+3)</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Your Local Time:</span>
                                    <span style="color: #1e293b;">${userLocalTimeFormatted} (${userTimezoneToUse})</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Doctor:</span>
                                    <span style="color: #1e293b;">Dr. Mehmet - Senior Implant Specialist</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Duration:</span>
                                    <span style="color: #1e293b;">${duration} minutes</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span style="font-weight: 600; color: #64748b;">Type:</span>
                                    <span style="color: #1e293b;">${type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>

                        ${calendarEvent.meetingLink ? `
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Meeting Link</h2>
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #328DFF;">
                                <a href="${calendarEvent.meetingLink}" style="color: #1e40af; text-decoration: none; font-weight: 600;">
                                    Join Video Consultation
                                </a>
                            </div>
                        </div>
                        ` : ''}

                        ${calendarEvent.calendarUrl ? `
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Add to Calendar</h2>
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #328DFF;">
                                <a href="${calendarEvent.calendarUrl}" style="color: #1e40af; text-decoration: none; font-weight: 600;">
                                    📅 Add to Google Calendar
                                </a>
                            </div>
                        </div>
                        ` : ''}

                        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Important Notes</h2>
                            <ul style="color: #64748b; line-height: 1.6; margin: 0; padding-left: 20px;">
                                <li>Please join the consultation 5 minutes before the scheduled time</li>
                                <li>Have your treatment plan and X-rays ready for discussion</li>
                                <li>Ensure you have a stable internet connection</li>
                                <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
                        <p style="margin: 0;">Thank you for choosing Implanner for your dental consultation.</p>
                        <p style="margin: 5px 0 0 0;">© 2024 Implanner. All rights reserved.</p>
                    </div>
                </div>
            `;

            await sendTestEmail({
                to: patientEmail,
                subject: patientEmailSubject,
                html: patientEmailHtml
            });

            console.log(`✅ Patient confirmation email sent to ${patientEmail} for consultation #${consultation.id}`);
        } catch (emailError) {
            console.error('❌ Failed to send patient confirmation email:', emailError);
        }

        // Send notification email to doctor
        try {
            const doctorEmailSubject = `New Consultation Booking - ${patientName}`;
            const doctorEmailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🩺 New Consultation Booking</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">A new consultation has been scheduled</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Patient Information</h2>
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Name:</span>
                                    <span style="color: #1e293b;">${patientName}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Email:</span>
                                    <span style="color: #1e293b;">${patientEmail}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Phone:</span>
                                    <span style="color: #1e293b;">${patientPhone || 'Not provided'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span style="font-weight: 600; color: #64748b;">Consultation ID:</span>
                                    <span style="color: #1e293b;">#${consultation.id}</span>
                                </div>
                            </div>
                        </div>

                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Appointment Details</h2>
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Date & Time:</span>
                                    <span style="color: #1e293b;">${formatDate(new Date(scheduledAt))} at ${formatTime(new Date(scheduledAt))} (Turkey Time)</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Duration:</span>
                                    <span style="color: #1e293b;">${duration} minutes</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="font-weight: 600; color: #64748b;">Type:</span>
                                    <span style="color: #1e293b;">${type.replace('_', ' ')}</span>
                                </div>
                                ${treatmentPlanId ? `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span style="font-weight: 600; color: #64748b;">Treatment Plan:</span>
                                    <span style="color: #1e293b;">ID #${treatmentPlanId}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        ${agenda ? `
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Discussion Topics</h2>
                            <p style="color: #64748b; line-height: 1.6; margin: 0;">${agenda}</p>
                        </div>
                        ` : ''}

                        ${patientNotes ? `
                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Patient Notes</h2>
                            <p style="color: #64748b; line-height: 1.6; margin: 0;">${patientNotes}</p>
                        </div>
                        ` : ''}

                        ${calendarEvent.meetingLink ? `
                        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Meeting Link</h2>
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #328DFF;">
                                <a href="${calendarEvent.meetingLink}" style="color: #1e40af; text-decoration: none; font-weight: 600;">
                                    Join Video Consultation
                                </a>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
                        <p style="margin: 0;">This is an automated notification from the Implanner platform.</p>
                        <p style="margin: 5px 0 0 0;">© 2024 Implanner. All rights reserved.</p>
                    </div>
                </div>
            `;

            await sendTestEmail({
                to: 'dr.mehmet@implanner.com', // Doctor's email
                subject: doctorEmailSubject,
                html: doctorEmailHtml
            });

            console.log(`✅ Doctor notification email sent for consultation #${consultation.id}`);
        } catch (emailError) {
            console.error('❌ Failed to send doctor notification email:', emailError);
        }

        res.status(201).json({
            success: true,
            consultation,
            calendarEvent: {
                eventId: calendarEvent.eventId,
                meetingLink: calendarEvent.meetingLink,
                calendarUrl: calendarEvent.event.htmlLink
            }
        });
    } catch (error) {
        console.error('Error booking consultation:', error);
        next(error);
    }
};

// Get user's consultations
const getUserConsultations = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { status, type, limit = 10, offset = 0 } = req.query;

        const where = {
            userId: parseInt(userId)
        };

        if (status) {
            where.status = status;
        }

        if (type) {
            where.type = type;
        }

        const consultations = await prisma.consultation.findMany({
            where,
            include: {
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true
                    }
                }
            },
            orderBy: {
                scheduledAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const total = await prisma.consultation.count({ where });

        res.json({
            success: true,
            consultations,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total > parseInt(offset) + parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error getting user consultations:', error);
        next(error);
    }
};

// Get consultation by ID
const getConsultationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.query; // Optional: verify user owns this consultation

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Consultation ID is required'
            });
        }

        const where = { id: parseInt(id) };
        if (userId) {
            where.userId = parseInt(userId);
        }

        const consultation = await prisma.consultation.findUnique({
            where: {
                id: parseInt(id),
                ...(userId && { userId: parseInt(userId) })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true,
                        storedPlan: true
                    }
                }
            }
        });

        if (!consultation) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        res.json({
            success: true,
            consultation
        });
    } catch (error) {
        console.error('Error getting consultation:', error);
        next(error);
    }
};

// Update consultation
const updateConsultation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            status,
            patientNotes,
            followUpNotes,
            recommendations,
            agenda,
            preparationNotes
        } = req.body;

        const updateData = {};
        
        if (status) updateData.status = status;
        if (patientNotes !== undefined) updateData.patientNotes = patientNotes;
        if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
        if (recommendations !== undefined) updateData.recommendations = recommendations;
        if (agenda !== undefined) updateData.agenda = agenda;
        if (preparationNotes !== undefined) updateData.preparationNotes = preparationNotes;

        // Add timestamps for status changes
        if (status === 'CANCELLED') {
            updateData.cancelledAt = new Date();
        } else if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        const consultation = await prisma.consultation.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true
                    }
                }
            }
        });

        res.json({
            success: true,
            consultation
        });
    } catch (error) {
        console.error('Error updating consultation:', error);
        next(error);
    }
};

// Cancel consultation
const cancelConsultation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const consultation = await prisma.consultation.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!consultation) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        if (consultation.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: 'Consultation is already cancelled'
            });
        }

        // Cancel Google Calendar event if it exists
        if (consultation.googleEventId) {
            try {
                await calendarService.deleteEvent(consultation.googleEventId);
            } catch (error) {
                console.error('Error cancelling Google Calendar event:', error);
                // Continue with database update even if calendar cancellation fails
            }
        }

        // Update consultation status
        const updatedConsultation = await prisma.consultation.update({
            where: { id: parseInt(id) },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                patientNotes: reason ? `${consultation.patientNotes || ''}\n\nCancellation reason: ${reason}`.trim() : consultation.patientNotes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true
                    }
                }
            }
        });

        res.json({
            success: true,
            consultation: updatedConsultation
        });
    } catch (error) {
        console.error('Error cancelling consultation:', error);
        next(error);
    }
};

// Get Google Calendar authorization URL
const getAuthUrl = async (req, res, next) => {
    try {
        const authUrl = calendarService.getAuthUrl();
        
        res.json({
            success: true,
            authUrl
        });
    } catch (error) {
        console.error('Error getting auth URL:', error);
        next(error);
    }
};

// Handle Google Calendar OAuth callback
const handleAuthCallback = async (req, res, next) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is required'
            });
        }

        const tokens = await calendarService.getTokens(code);
        
        res.json({
            success: true,
            tokens
        });
    } catch (error) {
        console.error('Error handling auth callback:', error);
        next(error);
    }
};

// Get all consultations for admin dashboard
const getAdminConsultations = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        // For now, let's make date filtering optional to debug the issue
        let whereClause = {};
        
        if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            
            whereClause = {
                createdAt: {
                    gte: startDateObj,
                    lte: endDateObj
                }
            };
        }

        const consultations = await prisma.consultation.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                treatmentPlan: {
                    select: {
                        id: true,
                        title: true,
                        summary: true,
                        storedPlan: true
                    }
                }
            },
            orderBy: {
                scheduledAt: 'asc'
            }
        });

        res.json({
            success: true,
            consultations
        });
    } catch (error) {
        console.error('Error fetching admin consultations:', error);
        next(error);
    }
};

// Create unavailable slot
const createUnavailableSlot = async (req, res, next) => {
    try {
        console.log('Backend - Creating unavailable slot with data:', req.body);
        console.log('Backend - User:', req.user);
        
        const { start, end, reason = 'Unavailable' } = req.body;
        
        if (!start || !end) {
            console.log('Backend - Missing start or end time');
            return res.status(400).json({
                success: false,
                message: 'Start and end times are required'
            });
        }

        const startTime = new Date(start);
        const endTime = new Date(end);

        if (startTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: 'Start time must be before end time'
            });
        }

        // Check for conflicts with existing consultations
        const conflictingConsultation = await prisma.consultation.findFirst({
            where: {
                status: {
                    in: ['SCHEDULED', 'CONFIRMED']
                },
                OR: [
                    {
                        scheduledAt: {
                            gte: startTime,
                            lt: endTime
                        }
                    },
                    {
                        scheduledAt: {
                            lt: startTime
                        },
                        scheduledAt: {
                            gte: new Date(startTime.getTime() - 60 * 60 * 1000) // 1 hour before
                        }
                    }
                ]
            }
        });

        if (conflictingConsultation) {
            return res.status(400).json({
                success: false,
                message: 'This time slot conflicts with an existing consultation'
            });
        }

        // Create unavailable slot in database
        console.log('Backend - Creating unavailable slot in database...');
        const unavailableSlot = await prisma.unavailableSlot.create({
            data: {
                startTime,
                endTime,
                reason,
                createdBy: req.user?.id ? String(req.user.id) : 'admin'
            }
        });

        console.log('Backend - Unavailable slot created successfully:', unavailableSlot);
        res.json({
            success: true,
            unavailableSlot
        });
    } catch (error) {
        console.error('Error creating unavailable slot:', error);
        next(error);
    }
};

// Get unavailable slots
const getUnavailableSlots = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const unavailableSlots = await prisma.unavailableSlot.findMany({
            where: {
                startTime: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        res.json({
            success: true,
            unavailableSlots
        });
    } catch (error) {
        console.error('Error fetching unavailable slots:', error);
        next(error);
    }
};

// Delete unavailable slot
const deleteUnavailableSlot = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const unavailableSlot = await prisma.unavailableSlot.findUnique({
            where: { id: parseInt(id) }
        });

        if (!unavailableSlot) {
            return res.status(404).json({
                success: false,
                message: 'Unavailable slot not found'
            });
        }

        await prisma.unavailableSlot.delete({
            where: { id: parseInt(id) }
        });

        res.json({
            success: true,
            message: 'Unavailable slot deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting unavailable slot:', error);
        next(error);
    }
};

// Cancel consultation with email notification
const cancelConsultationWithEmail = async (req, res, next) => {
    try {
        console.log('Backend - Cancelling consultation with email:', req.params, req.body);
        
        const { id } = req.params;
        const { reason } = req.body;
        
        const consultation = await prisma.consultation.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        });

        if (!consultation) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        if (consultation.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: 'Consultation is already cancelled'
            });
        }

        // Update consultation status
        const updatedConsultation = await prisma.consultation.update({
            where: { id: parseInt(id) },
            data: {
                status: 'CANCELLED',
                patientNotes: reason ? `Cancelled: ${reason}` : 'Cancelled: No reason provided',
                cancelledAt: new Date()
            }
        });

        // Send email notification
        try {
            const { sendConsultationCancellationEmail } = require('../utils/email');
            
            const emailResult = await sendConsultationCancellationEmail(
                consultation.user.email,
                consultation.user.name || 'Patient',
                new Date(consultation.scheduledAt).toLocaleDateString(),
                new Date(consultation.scheduledAt).toLocaleTimeString(),
                reason || 'No reason provided',
                'Dr. Mehmet'
            );

            if (emailResult.success) {
                console.log('Backend - Cancellation email sent successfully to:', consultation.user.email);
            } else {
                console.error('Backend - Failed to send cancellation email:', emailResult.error);
            }
            
        } catch (emailError) {
            console.error('Backend - Error sending cancellation email:', emailError);
            // Don't fail the cancellation if email fails
        }

        console.log('Backend - Consultation cancelled successfully:', updatedConsultation);
        res.json({
            success: true,
            message: 'Consultation cancelled successfully. Email notification sent.',
            consultation: updatedConsultation
        });
    } catch (error) {
        console.error('Error cancelling consultation:', error);
        next(error);
    }
};

module.exports = {
    getAvailableSlots,
    checkSlotAvailability,
    bookConsultation,
    getUserConsultations,
    getConsultationById,
    updateConsultation,
    cancelConsultation,
    getAuthUrl,
    handleAuthCallback,
    getAdminConsultations,
    createUnavailableSlot,
    getUnavailableSlots,
    deleteUnavailableSlot,
    cancelConsultationWithEmail
};
