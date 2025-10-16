const { PrismaClient } = require('../generated/prisma');
const { CranioCatchClient } = require('../utils/cranio-catch-client');
const { GeminiClient } = require('../utils/gemini-client');
const { TreatmentPlanningService } = require('../services/treatmentPlanning.service');
const { cloudinary } = require('../utils/cloudinary');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// Optimize Prisma connection pooling
prisma.$connect();

// Production timeout wrapper
const withTimeout = async (promise, timeoutMs = 15000) => {
    if (process.env.NODE_ENV !== 'production') return promise;
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
};

const cranio = new CranioCatchClient(
    process.env.CRANIOCATCH_API_URL,
    process.env.CRANIOCATCH_API_KEY,
    process.env.CRANIOCATCH_FACILITY_CODE
);
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);
const treatmentPlanningService = new TreatmentPlanningService();

// Map the shape we return to clients
const toPlanResponse = (plan, questionnaires) => ({
    id: plan.id,
    userId: plan.userId,
    source: plan.source,
    title: plan.title,
    summary: plan.summary,
    storedPlan: plan.storedPlan,
    hasXRay: plan.hasXRay,
    hasExistingPlan: plan.hasExistingPlan,
    budgetCents: plan.budgetCents,
    initialDataId: plan.initialDataId,
    xrayUrl: plan.xrayUrl,
    analysisJson: plan.analysisJson,
    implants: plan.implants,
    crowns: plan.crowns,
    fillings: plan.fillings,
    rootCanals: plan.rootCanals,
    selectedTeeth: plan.selectedTeeth,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    questionnaires: questionnaires || [],
});

// Internal helper to attach questionnaire/form data to a plan
const createFormData = async ({ userId, planId, form }) => {
    if (!form) return null;
    const {
        age,
        boneLoss,
        smoking,
        chronicDiseases,
        budgetPreference,
        medicalCondition,
        expectation,
        functionalIssues,
        // Additional fields from registration
        implants,
        crowns,
        fillings,
        rootCanals
    } = form;

    // Only include provided (non-undefined) fields
    const data = { userId };
    if (typeof age === 'number') data.age = age;
    if (typeof boneLoss === 'boolean') data.boneLoss = boneLoss;
    if (typeof smoking === 'boolean') data.smoking = smoking;
    if (typeof chronicDiseases === 'string') data.chronicDiseases = chronicDiseases;
    if (typeof budgetPreference === 'string') data.budgetPreference = budgetPreference;
    if (typeof medicalCondition === 'string') data.medicalCondition = medicalCondition;
    // Link to plan if your schema supports it; if not, this is ignored in select/return
    if (typeof planId === 'number') data.planId = planId;

    return prisma.questionnaire.create({ data });
};

module.exports = {
    // Create a treatment plan from either an X-ray analysis or form inputs
    createPlan: async (req, res, next) => {
        try {
            const createPlanPromise = async () => {
            const {
                userId,
                source, // 'xray' | 'form'
                // X-ray inputs
                xrayUrl,
                analysisId,
                // Form inputs (plan-level)
                implants,
                crowns,
                fillings,
                rootCanals,
                selectedTeeth,
                budgetCents,
                // Optional questionnaire payload to attach
                questionnaire,
                // User profile data that might need updating
                userProfile
            } = req.body || {};

            if (!userId) { const e = new Error('userId is required'); e.statusCode = 400; throw e; }

            // Prepare user profile update if needed
            let userUpdatePromise = Promise.resolve();
            if (userProfile && typeof userProfile === 'object') {
                const updateData = {};
                if (userProfile.phone && typeof userProfile.phone === 'string') updateData.phone = userProfile.phone;
                if (userProfile.country && typeof userProfile.country === 'string') updateData.country = userProfile.country;
                if (userProfile.contactMethod && ['EMAIL', 'PHONE', 'WHATSAPP'].includes(userProfile.contactMethod.toUpperCase())) {
                    updateData.contactMethod = userProfile.contactMethod.toUpperCase();
                }
                if (userProfile.age && typeof userProfile.age === 'number') updateData.age = userProfile.age;

                if (Object.keys(updateData).length > 0) {
                    userUpdatePromise = prisma.user.update({
                        where: { id: Number(userId) },
                        data: updateData
                    });
                }
            }

            // First check if user exists
            const existingUser = await prisma.user.findUnique({ 
                where: { id: Number(userId) } 
            });

            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please log in again.',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Run user update if needed
            if (userUpdatePromise) {
                await userUpdatePromise;
            }

            let planPayload = { userId: Number(userId) };
            let analysis = null;

            if (source === 'xray') {
                // Fetch analysis either from a provided CranioCatch id or an image URL
                if (analysisId) {
                    // Try to fetch from Craniocatch API first
                    try {
                        analysis = await cranio.fetchResultsById(analysisId);
                        console.log('Fetched analysis from Craniocatch API:', analysis);
                        
                        // If xrayUrl is provided, use it; otherwise try to extract from analysis
                        let finalXrayUrl = xrayUrl;
                        if (!finalXrayUrl && analysis && analysis.original_image) {
                            finalXrayUrl = analysis.original_image;
                        }
                        
                        // Update the analysis with the xrayUrl if we have it
                        if (finalXrayUrl) {
                            analysis.xrayUrl = finalXrayUrl;
                        }
                    } catch (apiError) {
                        console.warn('Failed to fetch from Craniocatch API, using analysisId directly:', apiError.message);
                        // If API fetch fails, create a minimal analysis structure with the ID
                        analysis = {
                            id: analysisId,
                            is_done: true,
                            error_status: false,
                            message: "Analysis completed successfully.",
                            results: {
                                tooth_results: {},
                                palate_results: [],
                                illness_pool: [],
                                measurement_results: [],
                                image_type: "Adult Panoramic"
                            },
                            xrayUrl: xrayUrl || null
                        };
                    }
                } else if (xrayUrl) {
                    analysis = await cranio.analyzeImageByUrl(xrayUrl);
                } else {
                    const e = new Error('For xray source, provide analysisId or xrayUrl'); 
                    e.statusCode = 400; 
                    throw e;
                }

                // Prepare questionnaire data for treatment planning
                const questionnaireData = questionnaire || {};
                
                // Generate treatment plan using the new service
                const treatmentPlanResult = await treatmentPlanningService.generateTreatmentPlan(analysis, questionnaireData);
                
                if (!treatmentPlanResult.success) {
                    const e = new Error(`Treatment plan generation failed: ${treatmentPlanResult.error}`);
                    e.statusCode = 500;
                    throw e;
                }

                const planOut = treatmentPlanResult.plan;

                // Determine the final xrayUrl to use
                let finalXrayUrl = xrayUrl;
                if (!finalXrayUrl && analysis && analysis.original_image) {
                    finalXrayUrl = analysis.original_image;
                }
                if (!finalXrayUrl && analysis && analysis.xrayUrl) {
                    finalXrayUrl = analysis.xrayUrl;
                }

                planPayload = {
                    ...planPayload,
                    source: 'xray',
                    hasXRay: true,
                    title: planOut.quickOverview?.title || 'AI Generated Treatment Plan',
                    summary: planOut.quickOverview?.summary || null,
                    storedPlan: JSON.stringify(planOut),
                    initialDataId: analysisId || null,
                    xrayUrl: finalXrayUrl || null,
                    analysisJson: analysis || null,
                };
            } else if (source === 'form') {
                // Extract and validate form data
                const { selectedTeeth, formData } = req.body;
                
                // Validate selected teeth
                if (!selectedTeeth || !Array.isArray(selectedTeeth)) {
                    const e = new Error('Selected teeth array is required for form source');
                    e.statusCode = 400;
                    throw e;
                }

                // Validate each tooth number format
                const invalidTeeth = selectedTeeth.filter(tooth => !(/^[1-4][1-8]$/.test(tooth)));
                if (invalidTeeth.length > 0) {
                    const e = new Error(`Invalid tooth numbers: ${invalidTeeth.join(', ')}`);
                    e.statusCode = 400;
                    throw e;
                }

                // Validate form data structure
                if (!formData || typeof formData !== 'object') {
                    const e = new Error('Form data object is required for form source');
                    e.statusCode = 400;
                    throw e;
                }

                // Validate treatment counts
                const treatments = ['implants', 'crowns', 'fillings', 'rootCanals'];
                treatments.forEach(treatment => {
                    if (formData[treatment] !== undefined && 
                        (typeof formData[treatment] !== 'number' || formData[treatment] < 0)) {
                        const e = new Error(`Invalid ${treatment} count: must be a non-negative number`);
                        e.statusCode = 400;
                        throw e;
                    }
                });

                // Validate medical data if provided
                if (formData.medicalCondition && typeof formData.medicalCondition !== 'string') {
                    const e = new Error('Medical condition must be a string');
                    e.statusCode = 400;
                    throw e;
                }

                if (formData.chronicDiseases && !Array.isArray(formData.chronicDiseases)) {
                    const e = new Error('Chronic diseases must be an array');
                    e.statusCode = 400;
                    throw e;
                }

                if (formData.age !== undefined && 
                    (typeof formData.age !== 'number' || formData.age < 0 || formData.age > 120)) {
                    const e = new Error('Age must be a number between 0 and 120');
                    e.statusCode = 400;
                    throw e;
                }

                // Create analysis structure for Gemini
                const formAnalysis = {
                    tooth_results: {},
                    treatment_methods: []
                };

                // Add selected teeth
                selectedTeeth.forEach(toothNumber => {
                    formAnalysis.tooth_results[toothNumber] = {
                        is_missing: true,
                        treatment_methods: [{
                            treatment_method: "Dental Implant",
                            treatment_method_slug: "dental_implant"
                        }]
                    };
                });

                // Add other treatments
                if (formData.crowns > 0) {
                    formAnalysis.treatment_methods.push({
                        treatment_method: "Crown",
                        count: formData.crowns
                    });
                }
                if (formData.fillings > 0) {
                    formAnalysis.treatment_methods.push({
                        treatment_method: "Filling",
                        count: formData.fillings
                    });
                }
                if (formData.rootCanals > 0) {
                    formAnalysis.treatment_methods.push({
                        treatment_method: "Root Canal",
                        count: formData.rootCanals
                    });
                }

                // Add medical considerations
                if (formData.medicalCondition && formData.medicalCondition !== 'None') {
                    formAnalysis.medical_considerations = {
                        condition: formData.medicalCondition,
                        smoking: formData.smoking || false,
                        age: formData.age || null,
                        chronicDiseases: formData.chronicDiseases || []
                    };
                }

                // Prepare questionnaire data for treatment planning
                const questionnaireData = {
                    ...questionnaire,
                    // Add form-specific data
                    implants: formData.implants || 0,
                    crowns: formData.crowns || 0,
                    fillings: formData.fillings || 0,
                    rootCanals: formData.rootCanals || 0,
                    selectedTeeth: selectedTeeth,
                    medicalCondition: formData.medicalCondition || 'None',
                    smoking: formData.smoking || false,
                    age: formData.age || 30,
                    chronicDiseases: formData.chronicDiseases || [],
                    budgetPreference: formData.budgetPreference || 'medium',
                    primaryExpectation: formData.primaryExpectation || 'Complete missing teeth only',
                    budgetApproach: formData.budgetApproach || 'Balanced'
                };

                // Generate treatment plan using the new service
                const treatmentPlanResult = await treatmentPlanningService.generateTreatmentPlan(formAnalysis, questionnaireData);
                
                if (!treatmentPlanResult.success) {
                    const e = new Error(`Treatment plan generation failed: ${treatmentPlanResult.error}`);
                    e.statusCode = 500;
                    throw e;
                }

                const planOut = treatmentPlanResult.plan;

                planPayload = {
                    ...planPayload,
                    source: 'form',
                    title: planOut.quickOverview?.title || 'Form Based Treatment Plan',
                    summary: planOut.quickOverview?.summary || null,
                    storedPlan: JSON.stringify(planOut),
                    implants: formData.implants || null,
                    crowns: formData.crowns || null,
                    fillings: formData.fillings || null,
                    rootCanals: formData.rootCanals || null,
                    selectedTeeth: selectedTeeth,
                };
            }

            // Add budget and other common fields
            if (typeof budgetCents === 'number') {
                planPayload.budgetCents = budgetCents;
            }

            // Set hasExistingPlan to true since we're creating a plan
            planPayload.hasExistingPlan = true;

            const savedPlan = await prisma.treatmentPlan.create({ data: planPayload });

            // Attach questionnaire if provided
            let savedQuestionnaire = null;
            if (questionnaire && typeof questionnaire === 'object') {
                // Include treatment data in questionnaire if available
                const completeQuestionnaireData = {
                    ...questionnaire,
                    // Add treatment plan data to questionnaire for reference
                    ...(source === 'form' && {
                        implants: planPayload.implants,
                        crowns: planPayload.crowns,
                        fillings: planPayload.fillings,
                        rootCanals: planPayload.rootCanals
                    })
                };
                savedQuestionnaire = await createFormData({ 
                    userId: Number(userId), 
                    planId: savedPlan.id, 
                    form: completeQuestionnaireData 
                });
            }

                // Return plan alongside any questionnaires for the user (and plan if schema supports)
                const questionnaires = await prisma.questionnaire.findMany({ 
                    where: { userId: Number(userId) },
                    orderBy: { createdAt: 'desc' },
                    take: 5 // Limit to most recent 5 questionnaires for performance
                });
                return res.status(201).json({ 
                    success: true, 
                    plan: toPlanResponse(savedPlan, questionnaires), 
                    questionnaire: savedQuestionnaire 
                });
            };

            await withTimeout(createPlanPromise());
        } catch (err) { next(err); }
    },

    // Get latest plan by user id, including questionnaires
    getPlanById: async (req, res, next) => {
        try {
            const { id } = req.params; // id is userId
            if (!id) { const e = new Error('userId is required'); e.statusCode = 400; throw e; }

            const getPlanPromise = async () => {
                // Run queries in parallel for better performance
                const [plan, questionnaires] = await Promise.all([
                    prisma.treatmentPlan.findFirst({
                        where: { userId: Number(id) },
                        orderBy: { createdAt: 'desc' },
                    }),
                    prisma.questionnaire.findMany({ 
                        where: { userId: Number(id) },
                        orderBy: { createdAt: 'desc' },
                        take: 5 // Limit to most recent 5 questionnaires for performance
                    })
                ]);

                if (!plan) { const e = new Error('No plan found for this user'); e.statusCode = 404; throw e; }

                return res.json({ success: true, plan: toPlanResponse(plan, questionnaires) });
            };

            await withTimeout(getPlanPromise());
        } catch (err) { next(err); }
    },

    // Get Cloudinary signature for X-ray uploads
    getCloudinarySignature: async (req, res, next) => {
        try {
            const userId = req.user && req.user.id;
            if (!userId) { const e = new Error('Unauthenticated'); e.statusCode = 401; throw e; }

            const getSignaturePromise = async () => {
                // Run user check and signature generation in parallel
                const timestamp = Math.floor(Date.now() / 1000);
                const folder = `${process.env.CLOUDINARY_XRAY_FOLDER || 'xray'}/${userId}`;

                const [, signature] = await Promise.all([
                    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
                    Promise.resolve(
                        cloudinary.utils.api_sign_request(
                            { folder, timestamp },
                            process.env.CLOUDINARY_API_SECRET
                        )
                    )
                ]);

                return res.json({
                    timestamp,
                    folder,
                    signature,
                    apiKey: process.env.CLOUDINARY_API_KEY,
                    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                });
            };

            await withTimeout(getSignaturePromise(), 5000); // Lower timeout for signature generation
        } catch (err) { next(err); }
    },

    // Analyze X-ray file directly with CranioCatch (minimal flow)
    analyzeMinimal: async (req, res, next) => {
        try {
            const file = req.file;
            if (!file || !file.buffer) {
                const e = new Error('Image file is required'); e.statusCode = 400; throw e;
            }

            const analyzePromise = async () => {
                const { rt_id, patient_id } = req.body || {};

                // Send file directly to CranioCatch with optimized timeout
                const analysis = await cranio.analyzeImageByFile(
                    {
                        buffer: file.buffer,
                        mimetype: file.mimetype,
                        originalname: file.originalname,
                    },
                    { rt_id, patient_id }
                );

                // Log asynchronously
                Promise.resolve().then(() => {
                    console.log(`CranioCatch analysis (direct file): ${JSON.stringify(analysis)}`);
                });

                // Extract image URLs from the analysis response
                const imageUrls = {
                    original: analysis.original_image || null,
                    draw: analysis.draw_image || null
                };

                return res.json({ 
                    success: true, 
                    analysis,
                    imageUrls 
                });
            };

            await withTimeout(analyzePromise(), 30000); // Longer timeout for image analysis
        } catch (err) { next(err); }
    },

    // Generate plan from CranioCatch result ID
    generatePlanFromCranioId: async (req, res, next) => {
        try {
            const { id, userId, source, selectedTeeth, formData } = req.body || {};
            if (!source) { const e = new Error('source is required'); e.statusCode = 400; throw e; }

            let analysis = null;
            let planOut = null;

            if (source === 'xray') {
                if (!id) { const e = new Error('id is required for xray source'); e.statusCode = 400; throw e; }
                analysis = await cranio.fetchResultsById(id);
                planOut = await gemini.generatePlanFromAnalysis(analysis);
            } else if (source === 'form') {
                if (!selectedTeeth) { const e = new Error('selectedTeeth is required for form source'); e.statusCode = 400; throw e; }
                
                // Create analysis-like structure for form data
                const formAnalysis = {
                    tooth_results: {},
                    treatment_methods: []
                };

                // Map selected teeth to analysis structure
                selectedTeeth.forEach((toothNumber) => {
                    formAnalysis.tooth_results[toothNumber] = {
                        is_missing: true,
                        treatment_methods: [{
                            treatment_method: "Dental Implant",
                            treatment_method_slug: "dental_implant"
                        }]
                    };
                });

                // Add other treatments if provided
                if (formData) {
                    if (formData.crowns) {
                        formAnalysis.treatment_methods.push({
                            treatment_method: "Crown",
                            count: formData.crowns
                        });
                    }
                    if (formData.fillings) {
                        formAnalysis.treatment_methods.push({
                            treatment_method: "Filling",
                            count: formData.fillings
                        });
                    }
                    if (formData.rootCanals) {
                        formAnalysis.treatment_methods.push({
                            treatment_method: "Root Canal",
                            count: formData.rootCanals
                        });
                    }
                }

                // Generate plan using Gemini
                planOut = await gemini.generatePlanFromFormData(formAnalysis);
            } else {
                const e = new Error('Invalid source type'); e.statusCode = 400; throw e;
            }

            const result = {
                id,
                plan: planOut.planJson || planOut.planText,
            };

            // If userId is provided, save the plan to the database
            if (userId) {
                try {
                    // Check if user already has a plan
                    const existingPlan = await prisma.treatmentPlan.findFirst({
                        where: { userId: Number(userId) },
                        orderBy: { createdAt: 'desc' },
                    });
                    
                    let savedPlan;
                    if (existingPlan) {
                        // Update existing plan
                        savedPlan = await prisma.treatmentPlan.update({
                            where: { id: existingPlan.id },
                            data: {
                                source: 'xray',
                                title: 'AI Generated Treatment Plan',
                                summary: 'Treatment plan generated from X-ray analysis',
                                hasXRay: true,
                                initialDataId: id,
                                storedPlan: planOut.planJson ? JSON.stringify(planOut.planJson) : planOut.planText,
                                analysisJson: analysis,
                            }
                        });
                        result.updatedExistingPlan = true;
                    } else {
                        // Create new plan
                        savedPlan = await prisma.treatmentPlan.create({
                            data: {
                                userId: Number(userId),
                                source: 'xray',
                                title: 'AI Generated Treatment Plan',
                                summary: 'Treatment plan generated from X-ray analysis',
                                hasXRay: true,
                                initialDataId: id,
                                storedPlan: planOut.planJson ? JSON.stringify(planOut.planJson) : planOut.planText,
                                analysisJson: analysis,
                            }
                        });
                        result.updatedExistingPlan = false;
                    }

                    result.savedPlanId = savedPlan.id;
                    result.savedToDatabase = true;
                    
                    console.log(`Treatment plan ${existingPlan ? 'updated' : 'saved'} to database for user ${userId}: ${savedPlan.id}`);
                } catch (error) {
                    console.error(`Failed to save treatment plan to database for user ${userId}:`, error);
                    result.savedToDatabase = false;
                    result.saveError = error.message;
                }
            }

            return res.json({ success: true, ...result });
        } catch (err) { next(err); }
    },

    // Get all plans for a user
    getAllPlansByUser: async (req, res, next) => {
        try {
            const { userId } = req.query;
            if (!userId) { const e = new Error('userId query param is required'); e.statusCode = 400; throw e; }

            const plans = await prisma.treatmentPlan.findMany({
                where: { userId: Number(userId) },
                orderBy: { createdAt: 'desc' },
            });

            return res.json({ success: true, plans });
        } catch (err) { next(err); }
    },

    // Get plan by plan ID
    getPlanByPlanId: async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) { const e = new Error('plan id is required'); e.statusCode = 400; throw e; }

            const plan = await prisma.treatmentPlan.findUnique({
                where: { id: Number(id) },
            });

            if (!plan) { const e = new Error('Plan not found'); e.statusCode = 404; throw e; }

            const questionnaires = await prisma.questionnaire.findMany({ where: { userId: plan.userId } });
            return res.json({ success: true, plan: toPlanResponse(plan, questionnaires) });
        } catch (err) { next(err); }
    },
};


