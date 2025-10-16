const { PrismaClient } = require('../generated/prisma');
const { sendTestEmail } = require('../utils/email');
const prisma = new PrismaClient();

// Create a new clinic request
const createClinicRequest = async (req, res) => {
  try {
    const {
      userId,
      clinicId,
      treatmentPlanId,
      requestedTreatments,
      estimatedCost,
      userPhone,
      userEmail,
      preferredContactMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!userId || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Clinic ID are required'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Log treatment data for debugging
    console.log('Creating clinic request with treatment data:', {
      userId,
      clinicId,
      treatmentPlanId,
      requestedTreatments: requestedTreatments ? `Array with ${requestedTreatments.length} treatments` : 'null',
      treatmentCount: requestedTreatments ? requestedTreatments.length : 0,
      requestedTreatmentsData: requestedTreatments
    });

    // Create the clinic request
    const clinicRequest = await prisma.clinicRequest.create({
      data: {
        userId,
        clinicId,
        treatmentPlanId: treatmentPlanId || null,
        requestedTreatments: requestedTreatments ? JSON.stringify(requestedTreatments) : null,
        estimatedCost: estimatedCost || null,
        userPhone: userPhone || user.phone,
        userEmail: userEmail || user.email,
        preferredContactMethod: preferredContactMethod || user.contactMethod || 'EMAIL',
        notes: notes || null,
        status: 'PENDING'
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
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true
          }
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            summary: true,
            source: true
          }
        }
      }
    });

    // Send confirmation email to patient
    try {
      const emailSubject = `Clinic Request Confirmation - Request #${clinicRequest.id}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #328DFF; margin-bottom: 20px;">Clinic Request Confirmation</h2>
          
          <p>Dear ${user.name || 'Valued Patient'},</p>
          
          <p>Thank you for submitting your clinic request through Implanner. We have received your request and our team will contact you soon to schedule your appointment.</p>
          
          <div style="background-color: #f8faff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details</h3>
            <p><strong>Request ID:</strong> #${clinicRequest.id}</p>
            <p><strong>Clinic:</strong> ${clinic.name}</p>
            <p><strong>Status:</strong> Pending</p>
            <p><strong>Submitted:</strong> ${new Date(clinicRequest.createdAt).toLocaleDateString()}</p>
            ${clinicRequest.treatmentPlan ? `<p><strong>Treatment Plan:</strong> ${clinicRequest.treatmentPlan.title}</p>` : ''}
          </div>
          
          <p>Our team will review your request and contact you within 24 hours to:</p>
          <ul>
            <li>Confirm your appointment details</li>
            <li>Discuss treatment options</li>
            <li>Provide cost estimates</li>
            <li>Answer any questions you may have</li>
          </ul>
          
          <p>If you have any urgent questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          The Implanner Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;

      await sendTestEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });

      console.log(`✅ Confirmation email sent to ${user.email} for request #${clinicRequest.id}`);
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Clinic request created successfully',
      data: clinicRequest
    });

  } catch (error) {
    console.error('Error creating clinic request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all clinic requests (Admin only)
const getAllClinicRequests = async (req, res) => {
  try {
    const {
      status,
      assignedAdminId,
      patientName,
      patientEmail,
      clinicName,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    if (status) {
      where.status = status;
    }
    if (assignedAdminId) {
      where.assignedAdminId = parseInt(assignedAdminId);
    }

    // Add search functionality
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { clinic: { name: { contains: search, mode: 'insensitive' } } },
        { userEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add specific filters
    if (patientName) {
      where.user = { name: { contains: patientName, mode: 'insensitive' } };
    }
    if (patientEmail) {
      where.user = { email: { contains: patientEmail, mode: 'insensitive' } };
    }
    if (clinicName) {
      where.clinic = { name: { contains: clinicName, mode: 'insensitive' } };
    }

    // Get clinic requests with pagination
    const [clinicRequests, total] = await Promise.all([
      prisma.clinicRequest.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              country: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              country: true,
              rating: true,
              reviewCount: true
            }
          },
          treatmentPlan: {
            select: {
              id: true,
              title: true,
              summary: true,
              source: true,
              storedPlan: true
            }
          },
          assignedAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.clinicRequest.count({ where })
    ]);

    // Parse requested treatments JSON and add treatment details
    const parsedRequests = clinicRequests.map(request => {
      const requestedTreatments = request.requestedTreatments ? JSON.parse(request.requestedTreatments) : null;
      
      // Parse treatment details
      let treatmentDetails = {
        implants: 0,
        crowns: 0,
        rootCanals: 0,
        fillings: 0,
        totalTreatments: 0,
        treatmentSummary: 'No treatments specified'
      };

      if (requestedTreatments && Array.isArray(requestedTreatments)) {
        treatmentDetails.totalTreatments = requestedTreatments.length;
        
        // Count specific treatment types
        requestedTreatments.forEach(treatment => {
          const treatmentName = (treatment.name || treatment.title || '').toLowerCase();
          if (treatmentName.includes('implant')) {
            treatmentDetails.implants += treatment.quantity || 1;
          } else if (treatmentName.includes('crown')) {
            treatmentDetails.crowns += treatment.quantity || 1;
          } else if (treatmentName.includes('root canal')) {
            treatmentDetails.rootCanals += treatment.quantity || 1;
          } else if (treatmentName.includes('filling')) {
            treatmentDetails.fillings += treatment.quantity || 1;
          }
        });

        // Create treatment summary
        const treatments = [];
        if (treatmentDetails.implants > 0) treatments.push(`${treatmentDetails.implants} implant${treatmentDetails.implants > 1 ? 's' : ''}`);
        if (treatmentDetails.crowns > 0) treatments.push(`${treatmentDetails.crowns} crown${treatmentDetails.crowns > 1 ? 's' : ''}`);
        if (treatmentDetails.rootCanals > 0) treatments.push(`${treatmentDetails.rootCanals} root canal${treatmentDetails.rootCanals > 1 ? 's' : ''}`);
        if (treatmentDetails.fillings > 0) treatments.push(`${treatmentDetails.fillings} filling${treatmentDetails.fillings > 1 ? 's' : ''}`);
        
        treatmentDetails.treatmentSummary = treatments.length > 0 ? treatments.join(', ') : 'No treatments specified';
      }

      return {
        ...request,
        requestedTreatments,
        availableDates: request.availableDates ? JSON.parse(request.availableDates) : null,
        treatmentDetails
      };
    });

    res.json({
      success: true,
      data: parsedRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching clinic requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get clinic request by ID
const getClinicRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const clinicRequest = await prisma.clinicRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            country: true,
            age: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            rating: true,
            reviewCount: true,
            services: true,
            specialties: true
          }
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            summary: true,
            source: true,
            storedPlan: true
          }
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!clinicRequest) {
      return res.status(404).json({
        success: false,
        message: 'Clinic request not found'
      });
    }

    // Parse JSON fields
    const parsedRequest = {
      ...clinicRequest,
      requestedTreatments: clinicRequest.requestedTreatments ? JSON.parse(clinicRequest.requestedTreatments) : null,
      availableDates: clinicRequest.availableDates ? JSON.parse(clinicRequest.availableDates) : null
    };

    res.json({
      success: true,
      data: parsedRequest
    });

  } catch (error) {
    console.error('Error fetching clinic request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update clinic request (Admin only)
const updateClinicRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      estimatedCost,
      actualCost,
      notes,
      adminNotes,
      clinicResponse,
      availableDates,
      scheduledDate,
      assignedAdminId,
      lastContactDate,
      nextFollowUpDate
    } = req.body;

    // Check if clinic request exists
    const existingRequest = await prisma.clinicRequest.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Clinic request not found'
      });
    }

    // Prepare update data
    const updateData = {};
    if (status) updateData.status = status;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (actualCost !== undefined) updateData.actualCost = actualCost;
    if (notes !== undefined) updateData.notes = notes;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (clinicResponse !== undefined) updateData.clinicResponse = clinicResponse;
    if (availableDates) updateData.availableDates = JSON.stringify(availableDates);
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (assignedAdminId) updateData.assignedAdminId = parseInt(assignedAdminId);
    if (lastContactDate) updateData.lastContactDate = new Date(lastContactDate);
    if (nextFollowUpDate) updateData.nextFollowUpDate = new Date(nextFollowUpDate);

    // Update the clinic request
    const updatedRequest = await prisma.clinicRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true
          }
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            summary: true,
            source: true
          }
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Parse JSON fields
    const parsedRequest = {
      ...updatedRequest,
      requestedTreatments: updatedRequest.requestedTreatments ? JSON.parse(updatedRequest.requestedTreatments) : null,
      availableDates: updatedRequest.availableDates ? JSON.parse(updatedRequest.availableDates) : null
    };

    // Send email notification if status changed to SCHEDULED
    if (status === 'SCHEDULED' && existingRequest.status !== 'SCHEDULED') {
      try {
        const emailSubject = `Appointment Scheduled - Request #${updatedRequest.id}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #328DFF, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📅 Appointment Scheduled!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your dental treatment appointment has been scheduled</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Appointment Details</h2>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Request ID:</span>
                    <span style="color: #1e293b;">#${updatedRequest.id}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Clinic:</span>
                    <span style="color: #1e293b;">${updatedRequest.clinic.name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Status:</span>
                    <span style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">SCHEDULED</span>
                  </div>
                  ${updatedRequest.scheduledDate ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Scheduled Date:</span>
                    <span style="color: #1e293b;">${new Date(updatedRequest.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: 600; color: #64748b;">Scheduled Date:</span>
                    <span style="color: #1e293b;">${new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              ${updatedRequest.availableDates ? `
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Available Dates</h2>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px;">
                  <p style="color: #64748b; margin: 0;">${Array.isArray(updatedRequest.availableDates) ? updatedRequest.availableDates.join(', ') : updatedRequest.availableDates}</p>
                </div>
              </div>
              ` : ''}

              ${updatedRequest.clinicResponse ? `
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Clinic Response</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0;">${updatedRequest.clinicResponse}</p>
              </div>
              ` : ''}

              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Next Steps</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
                  Your appointment has been scheduled successfully. Please arrive 15 minutes early for your appointment. If you need to reschedule or have any questions, please contact the clinic directly.
                </p>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #328DFF;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    <strong>Need to reschedule?</strong> Contact the clinic at ${updatedRequest.clinic.phone || 'the provided contact number'}
                  </p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
              <p style="margin: 0;">Thank you for choosing Implanner for your dental treatment planning.</p>
              <p style="margin: 5px 0 0 0;">© 2024 Implanner. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendTestEmail({
          to: updatedRequest.user.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Scheduled email sent to ${updatedRequest.user.email} for request #${updatedRequest.id}`);
      } catch (emailError) {
        console.error('❌ Failed to send scheduled email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification if status changed to CONTACTED
    if (status === 'CONTACTED' && existingRequest.status !== 'CONTACTED') {
      try {
        const emailSubject = `We've Contacted You - Request #${updatedRequest.id}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #328DFF, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📞 We've Contacted You!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Our team has reached out regarding your treatment request</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Request Details</h2>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Request ID:</span>
                    <span style="color: #1e293b;">#${updatedRequest.id}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Clinic:</span>
                    <span style="color: #1e293b;">${updatedRequest.clinic.name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Status:</span>
                    <span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">CONTACTED</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: 600; color: #64748b;">Contact Date:</span>
                    <span style="color: #1e293b;">${new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              ${updatedRequest.clinicResponse ? `
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Clinic Response</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0;">${updatedRequest.clinicResponse}</p>
              </div>
              ` : ''}

              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">What's Next?</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
                  Our team has contacted you regarding your treatment request. We may have called you, sent you a message, or reached out through your preferred contact method. Please check your phone and email for any missed communications.
                </p>
                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Missed our call?</strong> Please contact us at ${updatedRequest.clinic.phone || 'the clinic contact number'} or reply to this email.
                  </p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
              <p style="margin: 0;">Thank you for choosing Implanner for your dental treatment planning.</p>
              <p style="margin: 5px 0 0 0;">© 2024 Implanner. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendTestEmail({
          to: updatedRequest.user.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Contacted email sent to ${updatedRequest.user.email} for request #${updatedRequest.id}`);
      } catch (emailError) {
        console.error('❌ Failed to send contacted email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification if status changed to COMPLETED
    if (status === 'COMPLETED' && existingRequest.status !== 'COMPLETED') {
      try {
        const emailSubject = `Treatment Request Completed - Request #${updatedRequest.id}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #328DFF, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 Treatment Request Completed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your dental treatment request has been successfully completed</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Request Details</h2>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Request ID:</span>
                    <span style="color: #1e293b;">#${updatedRequest.id}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Clinic:</span>
                    <span style="color: #1e293b;">${updatedRequest.clinic.name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-weight: 600; color: #64748b;">Status:</span>
                    <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">COMPLETED</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: 600; color: #64748b;">Completed Date:</span>
                    <span style="color: #1e293b;">${new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              ${updatedRequest.actualCost ? `
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Cost Information</h2>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8fafc; border-radius: 6px;">
                  <span style="font-weight: 600; color: #64748b;">Final Cost:</span>
                  <span style="font-size: 24px; font-weight: bold; color: #10b981;">€${(updatedRequest.actualCost / 100).toLocaleString()}</span>
                </div>
              </div>
              ` : ''}

              ${updatedRequest.clinicResponse ? `
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Clinic Response</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0;">${updatedRequest.clinicResponse}</p>
              </div>
              ` : ''}

              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">Next Steps</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
                  Your treatment request has been completed successfully. If you have any questions or need further assistance, please don't hesitate to contact us.
                </p>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #328DFF;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    <strong>Need help?</strong> Contact our support team at support@implanner.com
                  </p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
              <p style="margin: 0;">Thank you for choosing Implanner for your dental treatment planning.</p>
              <p style="margin: 5px 0 0 0;">© 2024 Implanner. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendTestEmail({
          to: updatedRequest.user.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Completion email sent to ${updatedRequest.user.email} for request #${updatedRequest.id}`);
      } catch (emailError) {
        console.error('❌ Failed to send completion email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Clinic request updated successfully',
      data: parsedRequest
    });

  } catch (error) {
    console.error('Error updating clinic request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get clinic request statistics (Admin only)
const getClinicRequestStats = async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      contactedRequests,
      scheduledRequests,
      completedRequests,
      cancelledRequests
    ] = await Promise.all([
      prisma.clinicRequest.count(),
      prisma.clinicRequest.count({ where: { status: 'PENDING' } }),
      prisma.clinicRequest.count({ where: { status: 'CONTACTED' } }),
      prisma.clinicRequest.count({ where: { status: 'SCHEDULED' } }),
      prisma.clinicRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.clinicRequest.count({ where: { status: 'CANCELLED' } })
    ]);

    // Get recent requests (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRequests = await prisma.clinicRequest.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalRequests,
        pending: pendingRequests,
        contacted: contactedRequests,
        scheduled: scheduledRequests,
        completed: completedRequests,
        cancelled: cancelledRequests,
        recent: recentRequests
      }
    });

  } catch (error) {
    console.error('Error fetching clinic request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update clinic request status only
const updateClinicRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    // Check if clinic request exists
    const existingRequest = await prisma.clinicRequest.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Clinic request not found'
      });
    }

    // Update the status
    const updatedRequest = await prisma.clinicRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        adminNotes: notes || existingRequest.adminNotes,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Clinic request status updated successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Error updating clinic request status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Assign or change clinic for a request
const assignClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicId, notes } = req.body;

    // Validate clinic ID
    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID is required'
      });
    }

    // Check if clinic request exists
    const existingRequest = await prisma.clinicRequest.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Clinic request not found'
      });
    }

    // Check if clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: parseInt(clinicId) }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Update the clinic assignment
    const updatedRequest = await prisma.clinicRequest.update({
      where: { id: parseInt(id) },
      data: {
        clinicId: parseInt(clinicId),
        adminNotes: notes || existingRequest.adminNotes,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Clinic assigned successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Error assigning clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export clinic requests to CSV
const exportClinicRequests = async (req, res) => {
  try {
    const {
      status,
      patientName,
      patientEmail,
      clinicName,
      search,
      startDate,
      endDate
    } = req.query;

    // Build where clause (same as getAllClinicRequests)
    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { clinic: { name: { contains: search, mode: 'insensitive' } } },
        { userEmail: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (patientName) {
      where.user = { name: { contains: patientName, mode: 'insensitive' } };
    }
    if (patientEmail) {
      where.user = { email: { contains: patientEmail, mode: 'insensitive' } };
    }
    if (clinicName) {
      where.clinic = { name: { contains: clinicName, mode: 'insensitive' } };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get all clinic requests (no pagination for export)
    const clinicRequests = await prisma.clinicRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            country: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true
          }
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            summary: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse and format data for CSV
    const csvData = clinicRequests.map(request => {
      const requestedTreatments = request.requestedTreatments ? JSON.parse(request.requestedTreatments) : null;
      
      // Parse treatment details
      let treatmentDetails = {
        implants: 0,
        crowns: 0,
        rootCanals: 0,
        fillings: 0,
        totalTreatments: 0
      };

      if (requestedTreatments && Array.isArray(requestedTreatments)) {
        treatmentDetails.totalTreatments = requestedTreatments.length;
        
        requestedTreatments.forEach(treatment => {
          const treatmentName = (treatment.name || treatment.title || '').toLowerCase();
          if (treatmentName.includes('implant')) {
            treatmentDetails.implants += treatment.quantity || 1;
          } else if (treatmentName.includes('crown')) {
            treatmentDetails.crowns += treatment.quantity || 1;
          } else if (treatmentName.includes('root canal')) {
            treatmentDetails.rootCanals += treatment.quantity || 1;
          } else if (treatmentName.includes('filling')) {
            treatmentDetails.fillings += treatment.quantity || 1;
          }
        });
      }

      return {
        'Request ID': request.id,
        'Patient Name': request.user?.name || 'N/A',
        'Patient Email': request.user?.email || request.userEmail || 'N/A',
        'Patient Phone': request.user?.phone || request.userPhone || 'N/A',
        'Patient Country': request.user?.country || 'N/A',
        'Clinic Name': request.clinic?.name || 'N/A',
        'Clinic Email': request.clinic?.email || 'N/A',
        'Clinic Phone': request.clinic?.phone || 'N/A',
        'Clinic Location': `${request.clinic?.city || ''}, ${request.clinic?.country || ''}`.replace(/^, |, $/, ''),
        'Status': request.status,
        'Total Treatments': treatmentDetails.totalTreatments,
        'Implants': treatmentDetails.implants,
        'Crowns': treatmentDetails.crowns,
        'Root Canals': treatmentDetails.rootCanals,
        'Fillings': treatmentDetails.fillings,
        'Estimated Cost': request.estimatedCost ? `€${(request.estimatedCost / 100).toLocaleString()}` : 'Not set',
        'Actual Cost': request.actualCost ? `€${(request.actualCost / 100).toLocaleString()}` : 'Not set',
        'Treatment Plan': request.treatmentPlan?.title || 'N/A',
        'Notes': request.notes || '',
        'Admin Notes': request.adminNotes || '',
        'Clinic Response': request.clinicResponse || '',
        'Scheduled Date': request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString() : 'Not scheduled',
        'Created Date': new Date(request.createdAt).toLocaleDateString(),
        'Last Updated': new Date(request.updatedAt).toLocaleDateString()
      };
    });

    // Convert to CSV
    if (csvData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for export'
      });
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="clinic-requests-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting clinic requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createClinicRequest,
  getAllClinicRequests,
  getClinicRequestById,
  updateClinicRequest,
  updateClinicRequestStatus,
  assignClinic,
  getClinicRequestStats,
  exportClinicRequests
};
