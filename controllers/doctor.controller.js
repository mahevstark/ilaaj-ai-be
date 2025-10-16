const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { validationResult } = require('express-validator');

// Create a new doctor
const createDoctor = async (req, res) => {
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
      firstName,
      lastName,
      email,
      phone,
      specialization,
      qualifications,
      languages,
      experience,
      licenseNumber,
      licenseExpiry,
      bio,
      profileImage,
      address,
      city,
      state,
      country,
      postalCode,
      education,
      certifications,
      awards,
      publications,
      workingHours,
      consultationFee,
      isAvailable
    } = req.body;

    const doctorData = {
      firstName,
      lastName,
      email,
      phone,
      specialization: specialization || [],
      qualifications: qualifications || [],
      languages: languages || [],
      experience: experience ? parseInt(experience) : null,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      bio,
      profileImage,
      address,
      city,
      state,
      country,
      postalCode,
      education: education ? JSON.parse(education) : null,
      certifications: certifications || [],
      awards: awards || [],
      publications: publications || [],
      workingHours: workingHours ? JSON.parse(workingHours) : null,
      consultationFee: consultationFee ? parseInt(consultationFee) : null,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    };

    const doctor = await prisma.doctor.create({
      data: doctorData,
      include: {
        clinicAssociations: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Error creating doctor:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email or license number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all doctors with pagination and filtering
const getAllDoctors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      specialization,
      city,
      country,
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
    
    if (status) where.status = status;
    if (specialization) where.specialization = { has: specialization };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { specialization: { has: search } },
        { bio: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy object
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          clinicAssociations: {
            where: { isActive: true },
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  country: true,
                  status: true
                }
              }
            }
          },
          _count: {
            select: {
              appointments: true,
              clinicAssociations: true
            }
          }
        }
      }),
      prisma.doctor.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        doctors,
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
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = parseInt(id);

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID'
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        clinicAssociations: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
                status: true,
                address: true,
                phone: true,
                website: true
              }
            }
          }
        },
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
            duration: true,
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
            appointments: true,
            clinicAssociations: true
          }
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: doctor
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = parseInt(id);

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID'
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

    // Check if doctor exists
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!existingDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const updateData = { ...req.body };

    // Parse JSON fields if they're strings
    if (updateData.education && typeof updateData.education === 'string') {
      updateData.education = JSON.parse(updateData.education);
    }
    if (updateData.workingHours && typeof updateData.workingHours === 'string') {
      updateData.workingHours = JSON.parse(updateData.workingHours);
    }

    // Convert date fields
    if (updateData.licenseExpiry) {
      updateData.licenseExpiry = new Date(updateData.licenseExpiry);
    }

    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: updateData,
      include: {
        clinicAssociations: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Error updating doctor:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email or license number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = parseInt(id);

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID'
      });
    }

    // Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await prisma.doctor.delete({
      where: { id: doctorId }
    });

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Associate doctor with clinic
const associateDoctorWithClinic = async (req, res) => {
  try {
    const { doctorId, clinicId } = req.params;
    const { role, startDate, endDate, notes } = req.body;

    const doctorIdInt = parseInt(doctorId);
    const clinicIdInt = parseInt(clinicId);

    if (isNaN(doctorIdInt) || isNaN(clinicIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor or clinic ID'
      });
    }

    // Check if doctor and clinic exist
    const [doctor, clinic] = await Promise.all([
      prisma.doctor.findUnique({ where: { id: doctorIdInt } }),
      prisma.clinic.findUnique({ where: { id: clinicIdInt } })
    ]);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Check if association already exists
    const existingAssociation = await prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId: doctorIdInt,
          clinicId: clinicIdInt
        }
      }
    });

    if (existingAssociation) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is already associated with this clinic'
      });
    }

    const association = await prisma.doctorClinic.create({
      data: {
        doctorId: doctorIdInt,
        clinicId: clinicIdInt,
        role: role || 'EMPLOYEE',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        notes
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialization: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Doctor associated with clinic successfully',
      data: association
    });

  } catch (error) {
    console.error('Error associating doctor with clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Remove doctor from clinic
const removeDoctorFromClinic = async (req, res) => {
  try {
    const { doctorId, clinicId } = req.params;

    const doctorIdInt = parseInt(doctorId);
    const clinicIdInt = parseInt(clinicId);

    if (isNaN(doctorIdInt) || isNaN(clinicIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor or clinic ID'
      });
    }

    const association = await prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId: doctorIdInt,
          clinicId: clinicIdInt
        }
      }
    });

    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Doctor-clinic association not found'
      });
    }

    await prisma.doctorClinic.delete({
      where: {
        doctorId_clinicId: {
          doctorId: doctorIdInt,
          clinicId: clinicIdInt
        }
      }
    });

    res.json({
      success: true,
      message: 'Doctor removed from clinic successfully'
    });

  } catch (error) {
    console.error('Error removing doctor from clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get doctors by clinic
const getDoctorsByClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { isActive = true } = req.query;


    const clinicIdInt = parseInt(clinicId);

    if (isNaN(clinicIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID'
      });
    }

    const doctors = await prisma.doctorClinic.findMany({
      where: {
        clinicId: clinicIdInt,
        isActive: isActive === 'true' || isActive === true
      },
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
      },
      orderBy: {
        role: 'asc'
      }
    });


    res.json({
      success: true,
      data: doctors
    });

  } catch (error) {
    console.error('Error fetching doctors by clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get doctor statistics
const getDoctorStats = async (req, res) => {
  try {
    const stats = await prisma.doctor.aggregate({
      _count: {
        id: true
      }
    });

    const statusStats = await prisma.doctor.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const specializationStats = await prisma.doctor.groupBy({
      by: ['specialization'],
      _count: {
        id: true
      }
    });

    const availabilityStats = await prisma.doctor.groupBy({
      by: ['isAvailable'],
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        totalDoctors: stats._count.id,
        statusBreakdown: statusStats,
        specializationBreakdown: specializationStats,
        availabilityBreakdown: availabilityStats
      }
    });

  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  associateDoctorWithClinic,
  removeDoctorFromClinic,
  getDoctorsByClinic,
  getDoctorStats
};
