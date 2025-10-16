
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const treatmentController = require('../controllers/treatment.controller');
const { authenticate: authMiddleware } = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Validation middleware
const createTreatmentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Treatment name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Treatment name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must not exceed 50 characters'),
  
  body('basePrice')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base price must be a positive integer (in cents)'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),
  
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a non-negative integer (in minutes)'),
  
  body('recoveryTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Recovery time must be a non-negative integer (in minutes)'),
  
  body('successRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Success rate must be between 0 and 100'),
  
  body('maxDailyBookings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max daily bookings must be a positive integer'),
  
  body('clinicId')
    .notEmpty()
    .withMessage('Clinic ID is required')
    .isInt({ min: 1 })
    .withMessage('Clinic ID must be a positive integer'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  
  body('contraindications')
    .optional()
    .isArray()
    .withMessage('Contraindications must be an array'),
  
  body('sideEffects')
    .optional()
    .isArray()
    .withMessage('Side effects must be an array'),
  
  body('equipment')
    .optional()
    .isArray()
    .withMessage('Equipment must be an array'),
  
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  
  body('insuranceCoverage')
    .optional()
    .isArray()
    .withMessage('Insurance coverage must be an array')
];

const updateTreatmentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Treatment name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must not exceed 50 characters'),
  
  body('basePrice')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base price must be a positive integer (in cents)'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),
  
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a non-negative integer (in minutes)'),
  
  body('recoveryTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Recovery time must be a non-negative integer (in minutes)'),
  
  body('successRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Success rate must be between 0 and 100'),
  
  body('maxDailyBookings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max daily bookings must be a positive integer'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  
  body('contraindications')
    .optional()
    .isArray()
    .withMessage('Contraindications must be an array'),
  
  body('sideEffects')
    .optional()
    .isArray()
    .withMessage('Side effects must be an array'),
  
  body('equipment')
    .optional()
    .isArray()
    .withMessage('Equipment must be an array'),
  
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  
  body('insuranceCoverage')
    .optional()
    .isArray()
    .withMessage('Insurance coverage must be an array')
];

// Routes

// Create treatment (Admin only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  createTreatmentValidation,
  treatmentController.createTreatment
);

// Get all treatments with filtering and pagination
router.get(
  '/',
  treatmentController.getAllTreatments
);

// Get treatment by ID
router.get(
  '/:id',
  treatmentController.getTreatmentById
);

// Update treatment (Admin only)
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  updateTreatmentValidation,
  treatmentController.updateTreatment
);

// Delete treatment (Admin only)
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  treatmentController.deleteTreatment
);

// Get treatments by clinic
router.get(
  '/clinic/:clinicId',
  treatmentController.getTreatmentsByClinic
);

// Get treatment statistics (Admin only)
router.get(
  '/stats/overview',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  treatmentController.getTreatmentStats
);

module.exports = router;
