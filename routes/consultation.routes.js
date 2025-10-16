const express = require('express');
const router = express.Router();

const {
    getAvailableSlots,
    checkSlotAvailability,
    bookConsultation,
    getUserConsultations,
    getConsultationById,
    updateConsultation,
    cancelConsultation,
    getAuthUrl,
    handleAuthCallback,
    getAdminConsultations,
    createUnavailableSlot,
    getUnavailableSlots,
    deleteUnavailableSlot,
    cancelConsultationWithEmail
} = require('../controllers/consultation.controller');

const { authenticate } = require('../middlewares/auth.middleware');

// Public routes (no authentication required)
router.get('/auth-url', getAuthUrl);
router.get('/auth/callback', handleAuthCallback);
router.get('/available-slots', getAvailableSlots);
router.post('/check-availability', checkSlotAvailability);

// Admin routes (authentication required) - Must come before /:id routes
router.get('/admin', authenticate, getAdminConsultations);
router.post('/unavailable-slots', authenticate, createUnavailableSlot);
router.get('/unavailable-slots', authenticate, getUnavailableSlots);
router.delete('/unavailable-slots/:id', authenticate, deleteUnavailableSlot);

// Cancel consultation with email notification
router.post('/:id/cancel', authenticate, cancelConsultationWithEmail);

// Protected routes (authentication required)
router.post('/book', authenticate, bookConsultation);
router.get('/user/:userId', authenticate, getUserConsultations);
router.get('/:id', authenticate, getConsultationById);
router.put('/:id', authenticate, updateConsultation);
router.delete('/:id', authenticate, cancelConsultation);

module.exports = router;
