const express = require('express');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const doctorController = require('../controllers/doctor.controller');
const { authenticate: authMiddleware } = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

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

// Validation rules
const createDoctorValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .optional()
    .isString()
    .withMessage('Valid phone number is required'),
  
  body('specialization')
    .optional()
    .isArray()
    .withMessage('Specialization must be an array'),
  
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
  
  body('licenseExpiry')
    .optional()
    .isISO8601()
    .withMessage('License expiry must be a valid date'),
  
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  
  body('address')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  
  body('postalCode')
    .optional()
    .isPostalCode('any')
    .withMessage('Valid postal code is required'),
  
  body('education')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('Education must be valid JSON');
        }
      }
      return true;
    }),
  
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  
  body('awards')
    .optional()
    .isArray()
    .withMessage('Awards must be an array'),
  
  body('publications')
    .optional()
    .isArray()
    .withMessage('Publications must be an array'),
  
  body('workingHours')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('Working hours must be valid JSON');
        }
      }
      return true;
    }),
  
  body('consultationFee')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Consultation fee must be a positive integer'),
  
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Is available must be a boolean')
];

const updateDoctorValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid doctor ID is required'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .optional()
    .isString()
    .withMessage('Valid phone number is required'),
  
  body('specialization')
    .optional()
    .isArray()
    .withMessage('Specialization must be an array'),
  
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
  
  body('licenseExpiry')
    .optional()
    .isISO8601()
    .withMessage('License expiry must be a valid date'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'])
    .withMessage('Invalid status'),
  
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  
  body('address')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  
  body('postalCode')
    .optional()
    .isPostalCode('any')
    .withMessage('Valid postal code is required'),
  
  body('education')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('Education must be valid JSON');
        }
      }
      return true;
    }),
  
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  
  body('awards')
    .optional()
    .isArray()
    .withMessage('Awards must be an array'),
  
  body('publications')
    .optional()
    .isArray()
    .withMessage('Publications must be an array'),
  
  body('workingHours')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('Working hours must be valid JSON');
        }
      }
      return true;
    }),
  
  body('consultationFee')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Consultation fee must be a positive integer'),
  
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Is available must be a boolean')
];

const getDoctorByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid doctor ID is required')
];

const deleteDoctorValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid doctor ID is required')
];

const associateDoctorValidation = [
  param('doctorId')
    .isInt({ min: 1 })
    .withMessage('Valid doctor ID is required'),
  
  param('clinicId')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required'),
  
  body('role')
    .optional()
    .isIn(['OWNER', 'PARTNER', 'EMPLOYEE', 'CONTRACTOR'])
    .withMessage('Invalid role'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

const removeDoctorValidation = [
  param('doctorId')
    .isInt({ min: 1 })
    .withMessage('Valid doctor ID is required'),
  
  param('clinicId')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required')
];

const getDoctorsByClinicValidation = [
  param('clinicId')
    .isInt({ min: 1 })
    .withMessage('Valid clinic ID is required'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean')
];

// Routes

// Public routes (no authentication required)
router.get('/stats', 
  generalLimiter,
  doctorController.getDoctorStats
);

// Development: Make main doctor routes public (remove in production)
router.get('/',
  generalLimiter,
  doctorController.getAllDoctors
);

router.get('/:id',
  generalLimiter,
  getDoctorByIdValidation,
  doctorController.getDoctorById
);

router.get('/clinic/:clinicId',
  generalLimiter,
  getDoctorsByClinicValidation,
  doctorController.getDoctorsByClinic
);

// Protected routes (authentication required)
router.use(authMiddleware);

// Admin-only routes
router.post('/',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  createDoctorValidation,
  doctorController.createDoctor
);


router.put('/:id',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  updateDoctorValidation,
  doctorController.updateDoctor
);

router.delete('/:id',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  deleteDoctorValidation,
  doctorController.deleteDoctor
);

// Doctor-clinic association routes
router.post('/:doctorId/clinics/:clinicId',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  associateDoctorValidation,
  doctorController.associateDoctorWithClinic
);

router.delete('/:doctorId/clinics/:clinicId',
  strictLimiter,
  roleMiddleware(['ADMIN', 'super-admin']),
  removeDoctorValidation,
  doctorController.removeDoctorFromClinic
);

module.exports = router;
