const { TreatmentPlanningService } = require('../services/treatmentPlanning.service');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();
const treatmentPlanningService = new TreatmentPlanningService();

const generateTreatmentPlan = async (req, res) => {
  try {
    const { cranioCatchData, questionnaireData, userId } = req.body;

    if (!cranioCatchData || !questionnaireData) {
      return res.status(400).json({
        success: false,
        message: 'CranioCatch data and questionnaire data are required'
      });
    }

    // Generate treatment plan using Gemini
    const planResult = await treatmentPlanningService.generateTreatmentPlan(
      cranioCatchData,
      questionnaireData
    );

    if (!planResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate treatment plan',
        error: planResult.error
      });
    }

    // Only save to database if userId is provided
    let savedPlan = null;
    if (userId) {
      try {
        savedPlan = await prisma.treatmentPlan.create({
          data: {
            userId: userId,
            storedPlan: JSON.stringify(planResult.plan),
            source: 'craniocatch',
            title: planResult.plan.quickOverview?.title || 'AI-Generated Treatment Plan',
            summary: planResult.plan.conclusion?.consistencyWithGoals || 'Comprehensive treatment plan generated',
            analysisJson: cranioCatchData,
            hasXRay: true,
            selectedTeeth: planResult.plan.regionalPlanning?.implantSites?.map(site => site.fdiNumber) || []
          }
        });
      } catch (dbError) {
        console.error('Error saving treatment plan to database:', dbError);
        // Continue without saving to database
      }
    }

    res.json({
      success: true,
      plan: planResult.plan,
      planId: savedPlan?.id || null,
      message: 'Treatment plan generated successfully'
    });

  } catch (error) {
    console.error('Error in generateTreatmentPlan:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getClinicsForTreatment = async (req, res) => {
  try {
    const { treatmentTypes } = req.query;
    
    if (!treatmentTypes) {
      return res.status(400).json({
        success: false,
        message: 'Treatment types are required'
      });
    }

    const types = Array.isArray(treatmentTypes) ? treatmentTypes : [treatmentTypes];

    // Find clinics that offer the required treatments
    const clinics = await prisma.clinic.findMany({
      where: {
        status: 'ACTIVE',
        treatments: {
          some: {
            name: {
              in: types
            },
            status: 'ACTIVE',
            isAvailable: true
          }
        }
      },
      include: {
        treatments: {
          where: {
            name: {
              in: types
            },
            status: 'ACTIVE',
            isAvailable: true
          },
          select: {
            name: true,
            basePrice: true,
            currency: true,
            description: true,
            duration: true,
            successRate: true
          }
        }
      }
    });

    // Format the response
    const formattedClinics = clinics.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      description: clinic.description,
      city: clinic.city,
      country: clinic.country,
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      pricingTier: clinic.pricingTier,
      isVerified: clinic.isVerified,
      treatments: clinic.treatments.map(treatment => ({
        name: treatment.name,
        price: treatment.basePrice,
        currency: treatment.currency,
        description: treatment.description,
        duration: treatment.duration,
        successRate: treatment.successRate
      })),
      contactInfo: {
        phone: clinic.phone,
        email: clinic.email,
        website: clinic.website
      }
    }));

    res.json({
      success: true,
      clinics: formattedClinics,
      total: formattedClinics.length
    });

  } catch (error) {
    console.error('Error in getClinicsForTreatment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getDrMehmetContact = async (req, res) => {
  try {
    // For now, return demo contact information
    const contactInfo = {
      name: 'Dr. Mehmet',
      title: 'Chief Dental Surgeon',
      specialization: 'Oral and Maxillofacial Surgery',
      experience: '15+ years',
      qualifications: [
        'DDS - Istanbul University',
        'PhD - Oral Surgery',
        'Fellow - International Association of Oral and Maxillofacial Surgeons'
      ],
      contact: {
        email: 'demo@implanner.com',
        phone: 'Coming Soon',
        whatsapp: 'Coming Soon',
        consultationHours: 'Monday - Friday: 9:00 AM - 6:00 PM',
        emergencyContact: 'Available 24/7 for urgent cases'
      },
      languages: ['Turkish', 'English', 'German'],
      consultationFee: 'Free Initial Consultation',
      location: 'Istanbul, Turkey'
    };

    res.json({
      success: true,
      doctor: contactInfo
    });

  } catch (error) {
    console.error('Error in getDrMehmetContact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateTreatmentPlan,
  getClinicsForTreatment,
  getDrMehmetContact
};

