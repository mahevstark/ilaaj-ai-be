const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const slugify = require('slugify');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { uploadImage, uploadMultipleImages, deleteImage, deleteMultipleImages } = require('../utils/cloudinary');
const googlePlacesService = require('../services/googlePlaces.service');

// Note: Third-party API integrations removed as per requirements
// All clinic data will be manually added by admin users

// Utility functions
const generateSlug = (name, city, country) => {
  return slugify(`${name}-${city}-${country}`, { 
    lower: true, 
    strict: true,
    remove: /[*+~.()'"!:@]/g 
  });
};

const validateCoordinates = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Generate relevant treatments using Gemini AI and find matching clinics
const generateRelevantTreatmentsAndFindClinics = async (treatmentPlan, availableTreatments) => {
  try {
    console.log('Starting relevant treatment generation and clinic matching...');
    console.log('GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a dental treatment planning AI assistant. A user has requested a treatment plan, but no clinics in our database currently offer the exact treatments they need.

CURRENT TREATMENT PLAN REQUEST:
- Implants: ${treatmentPlan.quickOverview?.totalImplants || 0}
- Crowns: ${treatmentPlan.quickOverview?.totalCrowns || 0}
- Fillings: ${treatmentPlan.quickOverview?.totalFillings || 0}
- Root Canals: ${treatmentPlan.quickOverview?.totalRootCanals || 0}
- Veneers: ${treatmentPlan.quickOverview?.totalVeneers || 0}
- Complexity: ${treatmentPlan.quickOverview?.complexityLevel || 'Unknown'}

AVAILABLE TREATMENTS IN OUR CLINIC DATABASE:
Services: ${availableTreatments.services.join(', ')}
Specialties: ${availableTreatments.specialties.join(', ')}

Please suggest 3-5 relevant treatments that:
1. Use ONLY the treatments available in our clinic database (from the lists above)
2. Address the user's dental needs as closely as possible
3. Are realistic and commonly offered by dental clinics
4. Consider the complexity level and user expectations

For each treatment, provide:
- Treatment name (must be from available treatments)
- Brief description
- Why it's relevant to the user's needs

Respond in JSON format with this structure:
{
  "relevantTreatments": [
    {
      "name": "Treatment Name (from available list)",
      "description": "Brief description",
      "rationale": "Why this is relevant to the user's needs",
      "category": "service or specialty"
    }
  ],
  "message": "We found relevant treatments that can address your dental needs."
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const generatedData = JSON.parse(jsonMatch[0]);
      
      // Now find clinics that offer these treatments
      const relevantTreatments = generatedData.relevantTreatments || [];
      const treatmentNames = relevantTreatments.map(t => t.name);
      
      console.log('Generated relevant treatments:', treatmentNames);
      
      // Find clinics that offer any of these treatments
      const matchingClinics = await findClinicsByTreatments(treatmentNames);
      
      return {
        ...generatedData,
        matchingClinics: matchingClinics,
        totalClinicsFound: matchingClinics.length
      };
    } else {
      throw new Error('No valid JSON found in response');
    }
  } catch (error) {
    console.error('Error generating relevant treatments:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      relevantTreatments: [],
      matchingClinics: [],
      totalClinicsFound: 0,
      message: "We're working on finding the best treatment options for you. Please contact our support team for personalized recommendations."
    };
  }
};

// Helper function to find clinics by treatment names
const findClinicsByTreatments = async (treatmentNames) => {
  try {
    if (!treatmentNames || treatmentNames.length === 0) {
      return [];
    }
    
    // Create conditions for each treatment name
    const treatmentConditions = treatmentNames.map((treatment, index) => {
      return `("services" @> ARRAY[$${index + 1}] OR "specialties" @> ARRAY[$${index + 1}])`;
    }).join(' OR ');
    
    const query = `
      SELECT 
        id, name, slug, description, email, phone, website,
        address, city, state, country, "postalCode",
        latitude, longitude, "clinicType", status,
        rating, "reviewCount", "isVerified", services, specialties,
        0 as distance_km
      FROM "Clinic"
      WHERE status = 'ACTIVE' AND (${treatmentConditions})
      ORDER BY rating DESC, "reviewCount" DESC
      LIMIT 10
    `;
    
    console.log('Finding clinics for treatments:', treatmentNames);
    const clinics = await prisma.$queryRawUnsafe(query, ...treatmentNames);
    
    // Add treatment matching info to each clinic
    const clinicsWithMatches = clinics.map(clinic => {
      const matchedTreatments = treatmentNames.filter(treatment => 
        (clinic.services || []).includes(treatment) || 
        (clinic.specialties || []).includes(treatment)
      );
      
      return {
        ...clinic,
        matchedTreatments: matchedTreatments,
        treatmentMatchScore: Math.round((matchedTreatments.length / treatmentNames.length) * 100)
      };
    });
    
    return clinicsWithMatches;
  } catch (error) {
    console.error('Error finding clinics by treatments:', error);
    return [];
  }
};

// Create a new clinic (Admin only)
const createClinic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      photos,
      pricePerImplant,
      pricePerCrown,
      pricePerRootCanal,
      pricePerFilling,
      status,
      googleMapsLink
    } = req.body;

    // Validate required fields
    if (!name || !email || !photos || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and at least one photo are required'
      });
    }

    if (photos.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 photos allowed'
      });
    }

    if (!pricePerImplant || !pricePerCrown || !pricePerRootCanal || !pricePerFilling) {
      return res.status(400).json({
        success: false,
        message: 'All price fields are required'
      });
    }

    if (!googleMapsLink) {
      return res.status(400).json({
        success: false,
        message: 'Google Maps link is required'
      });
    }
    
    // Validate Google Maps URL format
    if (!googleMapsLink.includes('google.com/maps') && !googleMapsLink.includes('maps.google.com')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google Maps URL'
      });
    }

    // Fetch Google Places data
    console.log('🔍 Fetching Google Places data for clinic...');
    const googlePlacesResult = await googlePlacesService.fetchClinicReviews(googleMapsLink, name);
    
    let googlePlacesData = {
      googleMapsLink,
      googleRating: null,
      googleReviewCount: 0,
      googlePlaceId: null,
      googleReviews: null,
      googleReviewStats: null,
      lastReviewFetch: null
    };
    
    if (googlePlacesResult.success) {
      const data = googlePlacesResult.data;
      googlePlacesData = {
        googleMapsLink,
        googleRating: data.rating,
        googleReviewCount: data.userRatingsTotal,
        googlePlaceId: data.placeId,
        googleReviews: data.reviews,
        googleReviewStats: data.reviewStats,
        lastReviewFetch: new Date()
      };
      console.log(`✅ Successfully fetched Google Places data: ${data.name} (${data.rating}/5, ${data.userRatingsTotal} reviews)`);
    } else {
      console.log(`⚠️ Could not fetch Google Places data: ${googlePlacesResult.error}`);
    }

    // Generate unique slug
    const baseSlug = generateSlug(name, 'clinic', 'global');
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.clinic.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const clinicData = {
      name,
      slug,
      email,
      photos: photos || [],
      pricePerImplant: Math.round(parseFloat(pricePerImplant) * 100), // Convert to cents
      pricePerCrown: Math.round(parseFloat(pricePerCrown) * 100),
      pricePerRootCanal: Math.round(parseFloat(pricePerRootCanal) * 100),
      pricePerFilling: Math.round(parseFloat(pricePerFilling) * 100),
      status: status || 'ACTIVE',
      // Google Places data
      ...googlePlacesData,
      // Set default values for required fields
      clinicType: 'DENTAL',
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const clinic = await prisma.clinic.create({
      data: clinicData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                specialization: true,
                qualifications: true,
                languages: true,
                experience: true,
                licenseNumber: true,
                bio: true,
                profileImage: true,
                address: true,
                city: true,
                state: true,
                country: true,
                postalCode: true,
                education: true,
                certifications: true,
                awards: true,
                publications: true,
                workingHours: true,
                consultationFee: true,
                isAvailable: true,
                status: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        },
        treatments: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            subcategory: true,
            basePrice: true,
            priceRange: true,
            currency: true,
            isPriceNegotiable: true,
            duration: true,
            preparationTime: true,
            recoveryTime: true,
            requirements: true,
            contraindications: true,
            sideEffects: true,
            successRate: true,
            isAvailable: true,
            maxDailyBookings: true,
            equipment: true,
            certifications: true,
            insuranceCoverage: true,
            ageRestrictions: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: {
          select: {
            users: true,
            appointments: true,
            reviews: true,
            doctors: true,
            treatments: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      data: clinic
    });

  } catch (error) {
    console.error('Error creating clinic:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Clinic with this email or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all clinics with pagination and filtering
const getAllClinics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      clinicType,
      city,
      country,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const where = {};
    
    // For patient-facing endpoints, default to only active clinics
    // Admin endpoints can override this by passing status parameter or adminView flag
    if (status) {
      where.status = status;
    } else if (req.query.adminView === 'true') {
      // Admin view - show all clinics (no status filter)
      // Don't add status filter for admin view
    } else {
      // Default to active clinics for patient-facing requests
      where.status = 'ACTIVE';
    }
    if (clinicType) where.clinicType = clinicType;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { specialties: { has: search } }
      ];
    }

    // Build orderBy object
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [clinics, total] = await Promise.all([
      prisma.clinic.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          doctors: {
            include: {
              doctor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  specialization: true,
                  qualifications: true,
                  languages: true,
                  experience: true,
                  licenseNumber: true,
                  bio: true,
                  profileImage: true,
                  address: true,
                  city: true,
                  state: true,
                  country: true,
                  postalCode: true,
                  education: true,
                  certifications: true,
                  awards: true,
                  publications: true,
                  workingHours: true,
                  consultationFee: true,
                  isAvailable: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true
                }
              }
            }
          },
          treatments: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              subcategory: true,
              basePrice: true,
              priceRange: true,
              currency: true,
              isPriceNegotiable: true,
              duration: true,
              isAvailable: true,
              status: true
            }
          },
          _count: {
            select: {
              users: true,
              appointments: true,
              reviews: true,
              doctors: true,
              treatments: true
            }
          }
        }
      }),
      prisma.clinic.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        clinics,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get clinic by ID
const getClinicById = async (req, res) => {
  try {
    const { id } = req.params;
    const { patientView } = req.query; // Check if this is a patient-facing request
    const clinicId = parseInt(id);

    if (isNaN(clinicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID'
      });
    }

    // For patient-facing requests, only show active clinics
    const whereClause = { id: clinicId };
    if (patientView === 'true') {
      whereClause.status = 'ACTIVE';
    }

    const clinic = await prisma.clinic.findUnique({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                specialization: true,
                qualifications: true,
                languages: true,
                experience: true,
                licenseNumber: true,
                bio: true,
                profileImage: true,
                address: true,
                city: true,
                state: true,
                country: true,
                postalCode: true,
                education: true,
                certifications: true,
                awards: true,
                publications: true,
                workingHours: true,
                consultationFee: true,
                isAvailable: true,
                status: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        },
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            appointmentDate: 'desc'
          },
          take: 10
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        treatments: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            subcategory: true,
            basePrice: true,
            priceRange: true,
            currency: true,
            isPriceNegotiable: true,
            duration: true,
            preparationTime: true,
            recoveryTime: true,
            requirements: true,
            contraindications: true,
            sideEffects: true,
            successRate: true,
            isAvailable: true,
            maxDailyBookings: true,
            equipment: true,
            certifications: true,
            insuranceCoverage: true,
            ageRestrictions: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: {
          select: {
            users: true,
            appointments: true,
            reviews: true,
            doctors: true,
            treatments: true
          }
        }
      }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // For patient-facing requests, check if clinic is active
    if (patientView === 'true' && clinic.status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'Clinic not available'
      });
    }

    res.json({
      success: true,
      data: clinic
    });

  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update clinic
const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = parseInt(id);

    if (isNaN(clinicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if clinic exists
    const existingClinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!existingClinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    const updateData = { ...req.body };
    updateData.updatedBy = req.user.id;

    // Validate coordinates if provided
    if (updateData.latitude && updateData.longitude && 
        !validateCoordinates(updateData.latitude, updateData.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Parse JSON fields if they're strings
    if (updateData.operatingHours && typeof updateData.operatingHours === 'string') {
      updateData.operatingHours = JSON.parse(updateData.operatingHours);
    }
    if (updateData.socialMedia && typeof updateData.socialMedia === 'string') {
      updateData.socialMedia = JSON.parse(updateData.socialMedia);
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                specialization: true,
                qualifications: true,
                languages: true,
                experience: true,
                licenseNumber: true,
                bio: true,
                profileImage: true,
                address: true,
                city: true,
                state: true,
                country: true,
                postalCode: true,
                education: true,
                certifications: true,
                awards: true,
                publications: true,
                workingHours: true,
                consultationFee: true,
                isAvailable: true,
                status: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        },
        treatments: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            subcategory: true,
            basePrice: true,
            priceRange: true,
            currency: true,
            isPriceNegotiable: true,
            duration: true,
            preparationTime: true,
            recoveryTime: true,
            requirements: true,
            contraindications: true,
            sideEffects: true,
            successRate: true,
            isAvailable: true,
            maxDailyBookings: true,
            equipment: true,
            certifications: true,
            insuranceCoverage: true,
            ageRestrictions: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: {
          select: {
            users: true,
            appointments: true,
            reviews: true,
            doctors: true,
            treatments: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Clinic updated successfully',
      data: clinic
    });

  } catch (error) {
    console.error('Error updating clinic:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Clinic with this email or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Delete clinic
const deleteClinic = async (req, res) => {
  try {
    console.log('Backend - Delete clinic request received');
    console.log('Backend - Request params:', req.params);
    console.log('Backend - Request user:', req.user);
    
    const { id } = req.params;
    const clinicId = parseInt(id);
    
    console.log('Backend - Parsed clinic ID:', clinicId);

    if (isNaN(clinicId)) {
      console.log('Backend - Invalid clinic ID');
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID'
      });
    }

    // Check if clinic exists
    console.log('Backend - Checking if clinic exists...');
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!clinic) {
      console.log('Backend - Clinic not found');
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    console.log('Backend - Clinic found:', clinic.name);
    console.log('Backend - Deleting clinic...');

    await prisma.clinic.delete({
      where: { id: clinicId }
    });

    console.log('Backend - Clinic deleted successfully');
    res.json({
      success: true,
      message: 'Clinic deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Note: Third-party API integration functions removed as per requirements
// All clinic data will be manually added by admin users

// Get clinic statistics
const getClinicStats = async (req, res) => {
  try {
    const stats = await prisma.clinic.aggregate({
      _count: {
        id: true
      },
      _avg: {
        rating: true
      }
    });

    const statusStats = await prisma.clinic.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const typeStats = await prisma.clinic.groupBy({
      by: ['clinicType'],
      _count: {
        id: true
      }
    });

    const verifiedStats = await prisma.clinic.groupBy({
      by: ['isVerified'],
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        totalClinics: stats._count.id,
        averageRating: stats._avg.rating || 0,
        statusBreakdown: statusStats,
        typeBreakdown: typeStats,
        verificationBreakdown: verifiedStats
      }
    });

  } catch (error) {
    console.error('Error fetching clinic stats:', error);
    res.status(500).json({
        success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Search clinics by location
const searchClinicsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (!validateCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Use raw SQL for geospatial queries (PostgreSQL with PostGIS extension)
    // If PostGIS is not available, fall back to simple distance calculation
    let clinics;
    try {
      clinics = await prisma.$queryRaw`
        SELECT 
          id, name, slug, description, email, phone, website,
          address, city, state, country, "postalCode",
          latitude, longitude, "clinicType", status,
          rating, "reviewCount", "isVerified",
          ST_Distance(
            ST_Point(longitude, latitude)::geography,
            ST_Point(${lng}, ${lat})::geography
          ) / 1000 as distance_km
        FROM "Clinic"
        WHERE 
          latitude IS NOT NULL 
          AND longitude IS NOT NULL
          AND ST_DWithin(
            ST_Point(longitude, latitude)::geography,
            ST_Point(${lng}, ${lat})::geography,
            ${radiusKm * 1000}
          )
          AND status = 'ACTIVE'
        ORDER BY distance_km ASC
        LIMIT ${parseInt(limit)}
      `;
    } catch (postgisError) {
      console.log('PostGIS not available, using simple distance calculation');
      // Fallback to simple distance calculation using Haversine formula
      clinics = await prisma.$queryRaw`
        SELECT 
          id, name, slug, description, email, phone, website,
          address, city, state, country, "postalCode",
          latitude, longitude, "clinicType", status,
          rating, "reviewCount", "isVerified",
          (
            6371 * acos(
              cos(radians(${lat})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${lng})) + 
              sin(radians(${lat})) * 
              sin(radians(latitude))
            )
          ) as distance_km
        FROM "Clinic"
        WHERE 
          latitude IS NOT NULL 
          AND longitude IS NOT NULL
          AND status = 'ACTIVE'
        ORDER BY distance_km ASC
        LIMIT ${parseInt(limit)}
      `;
    }

    res.json({
      success: true,
      data: clinics
    });

  } catch (error) {
    console.error('Error searching clinics by location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Match clinics based on treatment requirements
const matchClinicsByTreatment = async (req, res) => {
  try {
    const { 
      treatmentPlan, 
      location, 
      radius = 50, 
      limit = 10 
    } = req.body;

    if (!treatmentPlan) {
      return res.status(400).json({
        success: false,
        message: 'Treatment plan is required'
      });
    }

    // Extract treatment requirements from the plan
    const requirements = extractTreatmentRequirements(treatmentPlan);
    console.log('Extracted treatment requirements:', requirements);

    // Build query conditions based on treatment requirements
    let whereConditions = ['status = \'ACTIVE\''];
    let queryParams = [];

    // Add location filter if provided
    if (location && location.latitude && location.longitude) {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);
      const radiusKm = parseFloat(radius);

      if (validateCoordinates(lat, lng)) {
        // Use Haversine formula for distance calculation (PostGIS not available)
        whereConditions.push(`
          (
            6371 * acos(
              cos(radians($${queryParams.length + 2})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians($${queryParams.length + 1})) + 
              sin(radians($${queryParams.length + 2})) * 
              sin(radians(latitude))
            )
          ) <= ${radiusKm}
        `);
        queryParams.push(lng, lat);
      }
    }

    // Add treatment-specific filters
    if (requirements.implants > 0) {
      whereConditions.push('("services" @> ARRAY[\'Dental Implants\'] OR "specialties" @> ARRAY[\'Dental Implants\'])');
    }
    
    if (requirements.crowns > 0) {
      whereConditions.push('("services" @> ARRAY[\'Crowns\'] OR "specialties" @> ARRAY[\'Crowns and Bridges\'])');
    }
    
    if (requirements.fillings > 0) {
      whereConditions.push('("services" @> ARRAY[\'Fillings\'] OR "specialties" @> ARRAY[\'Fillings\'])');
    }
    
    if (requirements.rootCanals > 0) {
      whereConditions.push('("services" @> ARRAY[\'Root Canal Treatment\'] OR "specialties" @> ARRAY[\'Root Canal Treatment\'])');
    }

    // Build the final query
    const query = `
      SELECT 
        id, name, slug, description, email, phone, website,
        address, city, state, country, "postalCode",
        latitude, longitude, "clinicType", status,
        rating, "reviewCount", "isVerified", services, specialties,
        ${location && location.latitude ? `
          (
            6371 * acos(
              cos(radians($${queryParams.length})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians($${queryParams.length - 1})) + 
              sin(radians($${queryParams.length})) * 
              sin(radians(latitude))
            )
          ) as distance_km
        ` : '0 as distance_km'}
      FROM "Clinic"
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        ${location && location.latitude ? 'distance_km ASC, ' : ''}
        rating DESC, 
        "reviewCount" DESC
      LIMIT ${parseInt(limit)}
    `;

    console.log('Executing clinic matching query:', query);
    console.log('Query parameters:', queryParams);

    const clinics = await prisma.$queryRawUnsafe(query, ...queryParams);

    // Add treatment matching score to each clinic
    const clinicsWithScores = clinics.map(clinic => ({
      ...clinic,
      treatmentMatchScore: calculateTreatmentMatchScore(clinic, requirements),
      matchedServices: getMatchedServices(clinic, requirements)
    }));

    // Sort by treatment match score and distance
    clinicsWithScores.sort((a, b) => {
      if (a.treatmentMatchScore !== b.treatmentMatchScore) {
        return b.treatmentMatchScore - a.treatmentMatchScore;
      }
      if (location && location.latitude) {
        return a.distance_km - b.distance_km;
      }
      return 0;
    });

    // If no clinics found, generate relevant treatments and find matching clinics
    if (clinicsWithScores.length === 0) {
      console.log('No matching clinics found, generating relevant treatments and finding clinics...');
      
      try {
        // Get all available treatments from the database
        const availableTreatments = await prisma.$queryRaw`
          SELECT 
            services,
            specialties
          FROM "Clinic"
          WHERE status = 'ACTIVE'
        `;
        
        // Flatten and deduplicate the arrays
        const allServices = [...new Set(availableTreatments.flatMap(clinic => clinic.services || []))];
        const allSpecialties = [...new Set(availableTreatments.flatMap(clinic => clinic.specialties || []))];
        
        const treatments = { 
          services: allServices, 
          specialties: allSpecialties 
        };
        
        console.log('Available treatments for relevant generation:', treatments);
        
        // Generate relevant treatments and find matching clinics
        const relevantData = await generateRelevantTreatmentsAndFindClinics(treatmentPlan, treatments);
        
        console.log('Generated relevant treatments and found clinics:', relevantData);
        
        if (relevantData.matchingClinics && relevantData.matchingClinics.length > 0) {
          res.json({
            success: true,
            data: relevantData.matchingClinics,
            requirements: requirements,
            relevantTreatments: relevantData.relevantTreatments,
            message: `Found ${relevantData.totalClinicsFound} clinics offering relevant treatments for your needs.`
          });
        } else {
          res.json({
            success: true,
            data: [],
            requirements: requirements,
            message: "No clinics found matching your exact requirements. Please contact our support team for personalized recommendations."
          });
        }
      } catch (altError) {
        console.error('Error generating relevant treatments:', altError);
        res.json({
          success: true,
          data: [],
          requirements: requirements,
          message: "No clinics found matching your exact requirements. Please contact our support team for personalized recommendations."
        });
      }
    } else {
    res.json({
      success: true,
        data: clinicsWithScores,
        requirements: requirements
    });
    }

  } catch (error) {
    console.error('Error matching clinics by treatment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Helper function to extract treatment requirements from plan
const extractTreatmentRequirements = (treatmentPlan) => {
  const requirements = {
    implants: 0,
    crowns: 0,
    fillings: 0,
    rootCanals: 0,
    veneers: 0,
    complexity: 'Low'
  };

  if (treatmentPlan.quickOverview) {
    requirements.implants = treatmentPlan.quickOverview.totalImplants || 0;
    requirements.crowns = treatmentPlan.quickOverview.totalCrowns || 0;
    requirements.veneers = treatmentPlan.quickOverview.totalVeneers || 0;
    requirements.complexity = treatmentPlan.quickOverview.complexityLevel || 'Low';
  }

  // Extract from regional planning if available
  if (treatmentPlan.regionalPlanning) {
    if (treatmentPlan.regionalPlanning.implantSites) {
      requirements.implants = Math.max(requirements.implants, treatmentPlan.regionalPlanning.implantSites.length);
    }
  }

  // Extract from treatment sequence if available
  if (treatmentPlan.treatmentSequence) {
    treatmentPlan.treatmentSequence.forEach(phase => {
      if (phase.treatments) {
        phase.treatments.forEach(treatment => {
          if (treatment.toLowerCase().includes('implant')) requirements.implants++;
          if (treatment.toLowerCase().includes('crown')) requirements.crowns++;
          if (treatment.toLowerCase().includes('filling')) requirements.fillings++;
          if (treatment.toLowerCase().includes('root canal')) requirements.rootCanals++;
        });
      }
    });
  }

  return requirements;
};

// Helper function to calculate treatment match score
const calculateTreatmentMatchScore = (clinic, requirements) => {
  let score = 0;
  const services = clinic.services || [];
  const specialties = clinic.specialties || [];

  if (requirements.implants > 0 && (services.includes('Dental Implants') || specialties.includes('Dental Implants'))) {
    score += 30;
  }
  if (requirements.crowns > 0 && (services.includes('Crowns') || specialties.includes('Crowns and Bridges'))) {
    score += 25;
  }
  if (requirements.fillings > 0 && (services.includes('Fillings') || specialties.includes('Fillings'))) {
    score += 15;
  }
  if (requirements.rootCanals > 0 && (services.includes('Root Canal Treatment') || specialties.includes('Root Canal Treatment'))) {
    score += 20;
  }
  if (requirements.veneers > 0 && (services.includes('Veneers') || specialties.includes('Veneers'))) {
    score += 10;
  }

  // Bonus for verified clinics
  if (clinic.isVerified) {
    score += 10;
  }

  // Bonus for high rating
  if (clinic.rating >= 4.5) {
    score += 15;
  } else if (clinic.rating >= 4.0) {
    score += 10;
  } else if (clinic.rating >= 3.5) {
    score += 5;
  }

  return Math.min(score, 100); // Cap at 100
};

// Helper function to get matched services
const getMatchedServices = (clinic, requirements) => {
  const services = clinic.services || [];
  const specialties = clinic.specialties || [];
  const matched = [];

  if (requirements.implants > 0 && (services.includes('Dental Implants') || specialties.includes('Dental Implants'))) {
    matched.push('Dental Implants');
  }
  if (requirements.crowns > 0 && (services.includes('Crowns') || specialties.includes('Crowns and Bridges'))) {
    matched.push('Crowns and Bridges');
  }
  if (requirements.fillings > 0 && (services.includes('Fillings') || specialties.includes('Fillings'))) {
    matched.push('Fillings');
  }
  if (requirements.rootCanals > 0 && (services.includes('Root Canal Treatment') || specialties.includes('Root Canal Treatment'))) {
    matched.push('Root Canal Treatment');
  }
  if (requirements.veneers > 0 && (services.includes('Veneers') || specialties.includes('Veneers'))) {
    matched.push('Veneers');
  }

  return matched;
};

// Upload single photo for a clinic
const uploadClinicPhoto = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
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

    // Upload to Cloudinary
    const uploadResult = await uploadImage(
      file.buffer, 
      `implanner/clinics/${clinicId}`, 
      { 
        public_id: `${clinicId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto' }
        ]
      }
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload photo',
        error: uploadResult.error
      });
    }

    // Update clinic with new photo URL
    const updatedClinic = await prisma.clinic.update({
      where: { id: parseInt(clinicId) },
      data: {
        photos: {
          push: uploadResult.url
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photoUrl: uploadResult.url,
        clinic: {
          id: updatedClinic.id,
          name: updatedClinic.name,
          photos: updatedClinic.photos
        }
      }
    });

  } catch (error) {
    console.error('Upload clinic photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload multiple photos for a clinic
const uploadClinicPhotos = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photo files provided'
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

    // Upload to Cloudinary
    const fileBuffers = files.map(file => file.buffer);
    const uploadResult = await uploadMultipleImages(
      fileBuffers, 
      `implanner/clinics/${clinicId}`, 
      { 
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto' }
        ]
      }
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload photos',
        error: uploadResult.error
      });
    }

    // Get successful upload URLs
    const photoUrls = uploadResult.results.map(result => result.url);

    // Update clinic with new photo URLs
    const updatedClinic = await prisma.clinic.update({
      where: { id: parseInt(clinicId) },
      data: {
        photos: {
          push: photoUrls
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `${photoUrls.length} photos uploaded successfully`,
      data: {
        photoUrls,
        clinic: {
          id: updatedClinic.id,
          name: updatedClinic.name,
          photos: updatedClinic.photos
        }
      }
    });

  } catch (error) {
    console.error('Upload clinic photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a photo from clinic
const deleteClinicPhoto = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
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

    // Remove photo URL from clinic photos array
    const updatedPhotos = clinic.photos.filter(photo => photo !== photoUrl);
    
    const updatedClinic = await prisma.clinic.update({
      where: { id: parseInt(clinicId) },
      data: {
        photos: updatedPhotos
      }
    });

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
      data: {
        clinic: {
          id: updatedClinic.id,
          name: updatedClinic.name,
          photos: updatedClinic.photos
        }
      }
    });

  } catch (error) {
    console.error('Delete clinic photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update clinic photos (replace all photos)
const updateClinicPhotos = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { photoUrls } = req.body;

    if (!photoUrls || !Array.isArray(photoUrls)) {
      return res.status(400).json({
        success: false,
        message: 'Photo URLs array is required'
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

    // Update clinic with new photo URLs
    const updatedClinic = await prisma.clinic.update({
      where: { id: parseInt(clinicId) },
      data: {
        photos: photoUrls
      }
    });

    res.status(200).json({
      success: true,
      message: 'Clinic photos updated successfully',
      data: {
        clinic: {
          id: updatedClinic.id,
          name: updatedClinic.name,
          photos: updatedClinic.photos
        }
      }
    });

  } catch (error) {
    console.error('Update clinic photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createClinic,
  getAllClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
  getClinicStats,
  searchClinicsByLocation,
  matchClinicsByTreatment,
  uploadClinicPhoto,
  uploadClinicPhotos,
  deleteClinicPhoto,
  updateClinicPhotos
};
