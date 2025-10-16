const express = require('express');
const { generateTreatmentPlan, getClinicsForTreatment, getDrMehmetContact } = require('../controllers/treatmentPlanning.controller');

const router = express.Router();

// Generate treatment plan using CranioCatch data and questionnaire
router.post('/generate-plan', generateTreatmentPlan);

// Get clinics that offer specific treatments
router.get('/clinics', getClinicsForTreatment);

// Get Dr. Mehmet's contact information
router.get('/dr-mehmet', getDrMehmetContact);

module.exports = router;

