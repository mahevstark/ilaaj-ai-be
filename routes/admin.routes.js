const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { getAdminOverview, exportAdminOverview } = require('../controllers/adminOverview.controller');

// Require auth for admin endpoints (authorization/role check can be added later)
router.use(authenticate);

// Overview metrics with optional filters: from, to, country, search
router.get('/overview', getAdminOverview);

// Export overview data
router.get('/overview/export', exportAdminOverview);

module.exports = router;


