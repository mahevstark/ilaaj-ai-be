const express = require('express');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const clinicController = require('../controllers/clinic.controller');
const { authenticate: authMiddleware } = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Note: bulkOperationLimiter removed as third-party integrations are no longer supported

// Validation rules
const createClinicValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Clinic name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Clinic name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('photos')
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 image and maximum 10 images are required'),
  
  body('pricePerImplant')
    .isInt({ min: 0 })
    .withMessage('Price per implant must be a positive number'),
  
  body('pricePerCrown')
    .isInt({ min: 0 })
    .withMessage('Price per crown must be a positive number'),
  
  body('pricePerRootCanal')
    .isInt({ min: 0 })
    .withMessage('Price per root canal must be a positive number'),
  
  body('pricePerFilling')
    .isInt({ min: 0 })
    .withMessage('Price per filling must be a positive number'),
  
  body('status')
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
  
  body('googleMapsLink')
    .isURL()
    .withMessage('Valid Google Maps URL is required')
    .custom((value) => {
      if (!value.includes('google.com/maps') && !value.includes('maps.google.com')) {
        throw new Error('Please provide a valid Google Maps URL');
      }
      return true;
    })
];

const updateClinicValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Clinic name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('photos')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 image and maximum 10 images are required'),
  
  body('pricePerImplant')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Price per implant must be a positive number'),
  
  body('pricePerCrown')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Price per crown must be a positive number'),
  
  body('pricePerRootCanal')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Price per root canal must be a positive number'),
  
  body('pricePerFilling')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Price per filling must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
  
  body('googleRating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Google rating must be between 1.0 and 5.0'),
  
  body('googleReviewCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Google review count must be a positive number')
];

const getClinicByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required')
];

const deleteClinicValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required')
];

// Note: Third-party validation functions removed as third-party integrations are no longer supported

const searchByLocationValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be between 0.1 and 100 km'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// Public routes (no authentication required)
router.get('/search/location', 
  generalLimiter,
  searchByLocationValidation,
  clinicController.searchClinicsByLocation
);

router.post('/match/treatment',
  generalLimiter,
  clinicController.matchClinicsByTreatment
);

router.get('/stats', 
  generalLimiter,
  clinicController.getClinicStats
);

// Development: Make main clinic routes public (remove in production)
router.get('/',
  generalLimiter,
  clinicController.getAllClinics
);

router.get('/:id',
  generalLimiter,
  getClinicByIdValidation,
  clinicController.getClinicById
);

// Protected routes (authentication required)
router.use(authMiddleware);

// Admin-only routes
router.post('/',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  createClinicValidation,
  clinicController.createClinic
);


router.put('/:id',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  updateClinicValidation,
  clinicController.updateClinic
);

router.delete('/:id',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  deleteClinicValidation,
  clinicController.deleteClinic
);

// Photo upload routes
router.post('/:clinicId/photos',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  upload.single('photo'),
  clinicController.uploadClinicPhoto
);

router.post('/:clinicId/photos/multiple',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  upload.array('photos', 10), // Maximum 10 photos
  clinicController.uploadClinicPhotos
);

router.delete('/:clinicId/photos',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  clinicController.deleteClinicPhoto
);

router.put('/:clinicId/photos',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  clinicController.updateClinicPhotos
);

// Get clinic pricing information
router.get('/pricing', async (req, res) => {
    try {
        const { PrismaClient } = require('../generated/prisma');
        const prisma = new PrismaClient();
        
        // Get average pricing from active clinics
        const treatments = await prisma.treatment.findMany({
            where: {
                status: 'ACTIVE',
                isAvailable: true,
                clinic: {
                    status: 'ACTIVE'
                }
            },
            select: {
                name: true,
                basePrice: true,
                category: true
            }
        });
        
        // Calculate average prices for different treatment types
        const implantTreatments = treatments.filter(t => 
            t.name.toLowerCase().includes('implant')
        );
        const crownTreatments = treatments.filter(t => 
            t.name.toLowerCase().includes('crown')
        );
        const fillingTreatments = treatments.filter(t => 
            t.name.toLowerCase().includes('filling')
        );
        const rootCanalTreatments = treatments.filter(t => 
            t.name.toLowerCase().includes('root canal')
        );
        const veneerTreatments = treatments.filter(t => 
            t.name.toLowerCase().includes('veneer')
        );
        
        const avgImplantPrice = implantTreatments.length > 0 
            ? Math.round(implantTreatments.reduce((sum, t) => sum + t.basePrice, 0) / implantTreatments.length)
            : 25000; // Default price in cents (€250)
            
        const avgCrownPrice = crownTreatments.length > 0 
            ? Math.round(crownTreatments.reduce((sum, t) => sum + t.basePrice, 0) / crownTreatments.length)
            : 12000; // Default price in cents (€120)
            
        const avgFillingPrice = fillingTreatments.length > 0 
            ? Math.round(fillingTreatments.reduce((sum, t) => sum + t.basePrice, 0) / fillingTreatments.length)
            : 3000; // Default price in cents (€30)
            
        const avgRootCanalPrice = rootCanalTreatments.length > 0 
            ? Math.round(rootCanalTreatments.reduce((sum, t) => sum + t.basePrice, 0) / rootCanalTreatments.length)
            : 9000; // Default price in cents (€90)
            
        const avgVeneerPrice = veneerTreatments.length > 0 
            ? Math.round(veneerTreatments.reduce((sum, t) => sum + t.basePrice, 0) / veneerTreatments.length)
            : 16000; // Default price in cents (€160)
        
        await prisma.$disconnect();
        
        res.json({
            success: true,
            data: {
                avgImplantPrice,
                avgCrownPrice,
                avgFillingPrice,
                avgRootCanalPrice,
                avgVeneerPrice,
                currency: 'EUR',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching clinic pricing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch clinic pricing',
            error: error.message
        });
    }
});

// Note: Third-party integration routes removed as third-party integrations are no longer supported

module.exports = router;
