const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { validationResult } = require('express-validator');

// Create a new treatment (Admin only)
const createTreatment = async (req, res) => {
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
      description,
      category,
      subcategory,
      basePrice,
      priceRange,
      currency = 'USD',
      isPriceNegotiable = false,
      duration,
      preparationTime,
      recoveryTime,
      requirements = [],
      contraindications = [],
      sideEffects = [],
      successRate,
      isAvailable = true,
      maxDailyBookings,
      clinicId,
      equipment = [],
      certifications = [],
      insuranceCoverage = [],
      ageRestrictions
    } = req.body;

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

    // Parse JSON fields if they're strings
    const parsedPriceRange = priceRange && typeof priceRange === 'string' 
      ? JSON.parse(priceRange) 
      : priceRange;
    
    const parsedAgeRestrictions = ageRestrictions && typeof ageRestrictions === 'string' 
      ? JSON.parse(ageRestrictions) 
      : ageRestrictions;

    const treatmentData = {
      name,
      description,
      category,
      subcategory,
      basePrice: basePrice ? parseInt(basePrice) : null,
      priceRange: parsedPriceRange,
      currency,
      isPriceNegotiable,
      duration: duration ? parseInt(duration) : null,
      preparationTime: preparationTime ? parseInt(preparationTime) : null,
      recoveryTime: recoveryTime ? parseInt(recoveryTime) : null,
      requirements,
      contraindications,
      sideEffects,
      successRate: successRate ? parseFloat(successRate) : null,
      isAvailable,
      maxDailyBookings: maxDailyBookings ? parseInt(maxDailyBookings) : null,
      clinicId: parseInt(clinicId),
      equipment,
      certifications,
      insuranceCoverage,
      ageRestrictions: parsedAgeRestrictions,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const treatment = await prisma.treatment.create({
      data: treatmentData,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Treatment created successfully',
      data: treatment
    });

  } catch (error) {
    console.error('Error creating treatment:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Treatment with this name already exists for this clinic'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all treatments with pagination and filtering
const getAllTreatments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      clinicId,
      category,
      subcategory,
      status,
      isAvailable,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const where = {};
    
    if (clinicId) where.clinicId = parseInt(clinicId);
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (subcategory) where.subcategory = { contains: subcategory, mode: 'insensitive' };
    if (status) where.status = status;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy object
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              address: true,
              phone: true,
              email: true
            }
          },
          _count: {
            select: {
              appointments: true
            }
          }
        }
      }),
      prisma.treatment.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        treatments,
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
    console.error('Error fetching treatments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get treatment by ID
const getTreatmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const treatmentId = parseInt(id);

    if (isNaN(treatmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid treatment ID'
      });
    }

    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            address: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
            phone: true,
            email: true,
            website: true,
            rating: true,
            reviewCount: true,
            isVerified: true
          }
        },
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
            price: true,
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
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment not found'
      });
    }

    res.json({
      success: true,
      data: treatment
    });

  } catch (error) {
    console.error('Error fetching treatment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update treatment
const updateTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatmentId = parseInt(id);

    if (isNaN(treatmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid treatment ID'
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

    // Check if treatment exists
    const existingTreatment = await prisma.treatment.findUnique({
      where: { id: treatmentId }
    });

    if (!existingTreatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment not found'
      });
    }

    const updateData = { ...req.body };
    updateData.updatedBy = req.user.id;

    // Parse JSON fields if they're strings
    if (updateData.priceRange && typeof updateData.priceRange === 'string') {
      updateData.priceRange = JSON.parse(updateData.priceRange);
    }
    if (updateData.ageRestrictions && typeof updateData.ageRestrictions === 'string') {
      updateData.ageRestrictions = JSON.parse(updateData.ageRestrictions);
    }

    // Convert numeric fields
    if (updateData.basePrice) updateData.basePrice = parseInt(updateData.basePrice);
    if (updateData.duration) updateData.duration = parseInt(updateData.duration);
    if (updateData.preparationTime) updateData.preparationTime = parseInt(updateData.preparationTime);
    if (updateData.recoveryTime) updateData.recoveryTime = parseInt(updateData.recoveryTime);
    if (updateData.successRate) updateData.successRate = parseFloat(updateData.successRate);
    if (updateData.maxDailyBookings) updateData.maxDailyBookings = parseInt(updateData.maxDailyBookings);

    const treatment = await prisma.treatment.update({
      where: { id: treatmentId },
      data: updateData,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Treatment updated successfully',
      data: treatment
    });

  } catch (error) {
    console.error('Error updating treatment:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Treatment with this name already exists for this clinic'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Delete treatment
const deleteTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatmentId = parseInt(id);

    if (isNaN(treatmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid treatment ID'
      });
    }

    // Check if treatment exists
    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment not found'
      });
    }

    await prisma.treatment.delete({
      where: { id: treatmentId }
    });

    res.json({
      success: true,
      message: 'Treatment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting treatment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get treatments by clinic
const getTreatmentsByClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { 
      category, 
      subcategory, 
      status, 
      isAvailable, 
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const clinicIdNum = parseInt(clinicId);

    if (isNaN(clinicIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID'
      });
    }

    // Check if clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicIdNum }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Build filter object
    const where = { clinicId: clinicIdNum };
    
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (subcategory) where.subcategory = { contains: subcategory, mode: 'insensitive' };
    if (status) where.status = status;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy object
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const treatments = await prisma.treatment.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: treatments
    });

  } catch (error) {
    console.error('Error fetching treatments by clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get treatment statistics
const getTreatmentStats = async (req, res) => {
  try {
    const stats = await prisma.treatment.aggregate({
      _count: {
        id: true
      },
      _avg: {
        basePrice: true,
        successRate: true
      }
    });

    const statusStats = await prisma.treatment.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const categoryStats = await prisma.treatment.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });

    const clinicStats = await prisma.treatment.groupBy({
      by: ['clinicId'],
      _count: {
        id: true
      },
      _avg: {
        basePrice: true
      }
    });

    res.json({
      success: true,
      data: {
        totalTreatments: stats._count.id,
        averagePrice: stats._avg.basePrice || 0,
        averageSuccessRate: stats._avg.successRate || 0,
        statusBreakdown: statusStats,
        categoryBreakdown: categoryStats,
        clinicBreakdown: clinicStats
      }
    });

  } catch (error) {
    console.error('Error fetching treatment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createTreatment,
  getAllTreatments,
  getTreatmentById,
  updateTreatment,
  deleteTreatment,
  getTreatmentsByClinic,
  getTreatmentStats
};
