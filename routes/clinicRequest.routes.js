const express = require('express');
const router = express.Router();
const clinicRequestController = require('../controllers/clinicRequest.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Create clinic request (Patient) - temporarily without auth for testing
router.post('/',
  clinicRequestController.createClinicRequest
);

// Get all clinic requests (Admin only)
router.get('/',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.getAllClinicRequests
);

// Get clinic request by ID (Admin only)
router.get('/:id',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.getClinicRequestById
);

// Update clinic request (Admin only)
router.put('/:id',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.updateClinicRequest
);

// Update clinic request status (Admin only)
router.patch('/:id/status',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.updateClinicRequestStatus
);

// Assign or change clinic for a request (Admin only)
router.patch('/:id/assign-clinic',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.assignClinic
);

// Get clinic request statistics (Admin only) - temporarily without auth for testing
router.get('/stats/overview',
  clinicRequestController.getClinicRequestStats
);

// Export clinic requests to CSV (Admin only)
router.get('/export',
  authenticate,
  roleMiddleware(['ADMIN']),
  clinicRequestController.exportClinicRequests
);

module.exports = router;
