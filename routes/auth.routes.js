const express = require('express');
const router = express.Router();

const {
    register,
    login,
    profile,
    verifyEmailByCode,
    resendVerificationCode,
    sendWhatsAppOTP,
    verifyGoogleToken,
    verifyGoogleAccessToken,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, profile);

router.post('/verify/code', verifyEmailByCode);
router.post('/resend-code', resendVerificationCode);
router.post('/whatsapp/send-otp', sendWhatsAppOTP);

router.post('/google/id-token', verifyGoogleToken);
router.post('/google/access-token', verifyGoogleAccessToken);

module.exports = router;


