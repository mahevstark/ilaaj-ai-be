const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Get user profile by ID
router.get('/:id', authenticate, getUserProfile);

module.exports = router;
