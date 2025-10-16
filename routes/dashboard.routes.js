const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
    getDashboardStats,
    getUserActivities,
    getUpcomingAppointments,
    getCompletedTreatments,
    getActiveRequests
} = require('../controllers/dashboard.controller');

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get user activities
router.get('/activities/:userId', getUserActivities);

// Get upcoming appointments
router.get('/upcoming/:userId', getUpcomingAppointments);

// Get completed treatments
router.get('/completed/:userId', getCompletedTreatments);

// Get active requests
router.get('/active-requests/:userId', getActiveRequests);

module.exports = router;
