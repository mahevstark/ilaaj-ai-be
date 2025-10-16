const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    updateUserStatus,
    exportUsers,
    getUserStats
} = require('../controllers/userManagement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

// Get all users with pagination, search, and filtering
router.get('/', authenticate, authorize(['ADMIN']), getAllUsers);

// Get user details by ID
router.get('/:id', authenticate, authorize(['ADMIN']), getUserById);

// Update user status (activate/deactivate)
router.patch('/:id/status', authenticate, authorize(['ADMIN']), updateUserStatus);

// Export users to CSV
router.get('/export/csv', authenticate, authorize(['ADMIN']), exportUsers);

// Get user statistics
router.get('/stats/overview', authenticate, authorize(['ADMIN']), getUserStats);

module.exports = router;
