const express = require('express');
const router = express.Router();
const multer = require('multer');

const { 
    createPlan, 
    getPlanById, 
    getCloudinarySignature,
    analyzeMinimal,
    generatePlanFromCranioId,
    getAllPlansByUser,
    getPlanByPlanId
} = require('../controllers/plan.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// X-ray analysis and plan generation (specific routes first)
router.post('/analyze-minimal', upload.single('image'), analyzeMinimal);
router.post('/generate-plan', generatePlanFromCranioId);
router.get('/user/all', authenticate, getAllPlansByUser);
router.post('/', createPlan);

// router.get('/plan/:id', authenticate, getPlanByPlanId);

// router.get('/cloudinary/signature', authenticate, getCloudinarySignature);
// router.get('/:id', authenticate, getPlanById);

module.exports = router;


