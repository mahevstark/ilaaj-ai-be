const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get dashboard statistics for a user
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get counts for different metrics
        const [
            activeRequests,
            completedTreatments,
            upcomingAppointments,
            totalSavings
        ] = await Promise.all([
            // Active requests (pending consultations)
            prisma.consultation.count({
                where: {
                    userId: userId,
                    status: {
                        in: ['SCHEDULED', 'CONFIRMED']
                    }
                }
            }),
            
            // Completed treatments (treatment plans with budget set)
            prisma.treatmentPlan.count({
                where: {
                    userId: userId,
                    budgetCents: {
                        not: null
                    }
                }
            }),
            
            // Upcoming appointments (scheduled consultations)
            prisma.consultation.count({
                where: {
                    userId: userId,
                    status: 'SCHEDULED',
                    scheduledAt: {
                        gte: new Date()
                    }
                }
            }),
            
            // Total budget (sum of budget from treatment plans)
            prisma.treatmentPlan.aggregate({
                where: {
                    userId: userId
                },
                _sum: {
                    budgetCents: true
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                activeRequests,
                completedTreatments,
                upcomingAppointments,
                totalSavings: (totalSavings._sum.budgetCents || 0) / 100 // Convert cents to dollars
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
};

// Get recent activities for a user
const getUserActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        // Get recent consultations and treatment plans
        const [recentConsultations, recentPlans] = await Promise.all([
            prisma.consultation.findMany({
                where: { userId: userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    type: true,
                    status: true,
                    scheduledAt: true,
                    createdAt: true,
                    patientName: true
                }
            }),
            prisma.treatmentPlan.findMany({
                where: { userId: userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    budgetCents: true
                }
            })
        ]);

        // Combine and format activities
        const activities = [
            ...recentConsultations.map(consultation => ({
                id: `consultation-${consultation.id}`,
                type: 'consultation',
                title: `Consultation ${consultation.type.toLowerCase().replace('_', ' ')}`,
                description: `Consultation with Dr. Mehmet`,
                status: consultation.status,
                date: consultation.createdAt,
                patientName: consultation.patientName
            })),
            ...recentPlans.map(plan => ({
                id: `plan-${plan.id}`,
                type: 'treatment_plan',
                title: plan.title || 'Treatment Plan',
                description: `Treatment plan created`,
                status: 'CREATED',
                date: plan.createdAt,
                estimatedCost: plan.budgetCents ? plan.budgetCents / 100 : null
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activities',
            error: error.message
        });
    }
};

// Get upcoming appointments for a user
const getUpcomingAppointments = async (req, res) => {
    try {
        const userId = req.user.id;

        const appointments = await prisma.consultation.findMany({
            where: {
                userId: userId,
                status: 'SCHEDULED',
                scheduledAt: {
                    gte: new Date()
                }
            },
            orderBy: { scheduledAt: 'asc' },
            select: {
                id: true,
                type: true,
                scheduledAt: true,
                duration: true,
                patientName: true,
                patientEmail: true,
                meetingLink: true,
                calendarUrl: true
            }
        });

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Error fetching upcoming appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming appointments',
            error: error.message
        });
    }
};

// Get completed treatments for a user
const getCompletedTreatments = async (req, res) => {
    try {
        const userId = req.user.id;

        const treatments = await prisma.treatmentPlan.findMany({
            where: {
                userId: userId,
                budgetCents: {
                    not: null
                }
            },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                summary: true,
                budgetCents: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            data: treatments
        });
    } catch (error) {
        console.error('Error fetching completed treatments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch completed treatments',
            error: error.message
        });
    }
};

// Get active requests for a user
const getActiveRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const [pendingConsultations, pendingPlans] = await Promise.all([
            prisma.consultation.findMany({
                where: {
                    userId: userId,
                    status: {
                        in: ['SCHEDULED', 'CONFIRMED']
                    }
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    scheduledAt: true,
                    createdAt: true,
                    patientName: true
                }
            }),
            prisma.treatmentPlan.findMany({
                where: {
                    userId: userId,
                    budgetCents: null
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    budgetCents: true
                }
            })
        ]);

        const activeRequests = [
            ...pendingConsultations.map(consultation => ({
                id: `consultation-${consultation.id}`,
                type: 'consultation',
                title: `Consultation ${consultation.type.toLowerCase().replace('_', ' ')}`,
                status: consultation.status,
                date: consultation.createdAt,
                scheduledAt: consultation.scheduledAt,
                patientName: consultation.patientName
            })),
            ...pendingPlans.map(plan => ({
                id: `plan-${plan.id}`,
                type: 'treatment_plan',
                title: plan.title || 'Treatment Plan',
                status: 'PENDING',
                date: plan.createdAt,
                estimatedCost: plan.budgetCents ? plan.budgetCents / 100 : null
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: activeRequests
        });
    } catch (error) {
        console.error('Error fetching active requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active requests',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getUserActivities,
    getUpcomingAppointments,
    getCompletedTreatments,
    getActiveRequests
};
