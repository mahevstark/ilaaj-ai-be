const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all users with pagination, search, and filtering
const getAllUsers = async (req, res, next) => {
    try {
        console.log('Backend - Fetching users with params:', req.query);
        
        const {
            page = 1,
            limit = 20,
            search = '',
            loginMethod = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {};
        
        // Search functionality
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { id: { equals: parseInt(search) || 0 } }
            ];
        }

        // Filter by login method (Google vs Manual)
        // Google users have empty password, manual users have hashed password
        if (loginMethod === 'GOOGLE') {
            where.password = '';
        } else if (loginMethod === 'MANUAL') {
            where.password = { not: '' };
        }

        // Filter by status (active/inactive)
        if (status === 'ACTIVE') {
            where.emailVerified = true;
        } else if (status === 'INACTIVE') {
            where.emailVerified = false;
        }

        // Get users with related data
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                role: true,
                country: true,
                phone: true,
                age: true,
                _count: {
                    select: {
                        treatmentPlans: true,
                        consultations: true,
                        clinicRequests: true
                    }
                }
            },
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take
        });

        // Get total count for pagination
        const totalUsers = await prisma.user.count({ where });

        // Calculate last login (we'll use updatedAt as proxy since we don't track login separately)
        const usersWithLastLogin = users.map(user => {
            const loginMethod = user.password === '' ? 'GOOGLE' : 'MANUAL';
            console.log(`User ${user.name} (${user.email}): password='${user.password}', loginMethod=${loginMethod}`);
            return {
                ...user,
                lastLoginAt: user.updatedAt,
                loginMethod: loginMethod, // Google users have empty password
                status: user.emailVerified ? 'ACTIVE' : 'INACTIVE',
                totalPlans: user._count.treatmentPlans,
                totalConsultations: user._count.consultations,
                totalRequests: user._count.clinicRequests
            };
        });

        console.log('Backend - Found users:', usersWithLastLogin.length);

        res.json({
            success: true,
            users: usersWithLastLogin,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / parseInt(limit)),
                totalUsers,
                hasNext: skip + take < totalUsers,
                hasPrev: skip > 0
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        next(error);
    }
};

// Get user details by ID
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('Backend - Fetching user details for ID:', id);

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                treatmentPlans: {
                    select: {
                        id: true,
                        createdAt: true,
                        hasXRay: true,
                        xrayUrl: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                consultations: {
                    select: {
                        id: true,
                        status: true,
                        scheduledAt: true,
                        type: true
                    },
                    orderBy: { scheduledAt: 'desc' },
                    take: 5
                },
                clinicRequests: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                _count: {
                    select: {
                        treatmentPlans: true,
                        consultations: true,
                        clinicRequests: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userDetails = {
            ...user,
            loginMethod: user.password === '' ? 'GOOGLE' : 'MANUAL', // Google users have empty password
            status: user.emailVerified ? 'ACTIVE' : 'INACTIVE',
            lastLoginAt: user.updatedAt,
            totalPlans: user._count.treatmentPlans,
            totalConsultations: user._count.consultations,
            totalRequests: user._count.clinicRequests
        };

        console.log('Backend - User details found:', userDetails.id);

        res.json({
            success: true,
            user: userDetails
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        next(error);
    }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log('Backend - Updating user status:', { id, status });

        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be ACTIVE or INACTIVE'
            });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                emailVerified: status === 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true
            }
        });

        console.log('Backend - User status updated:', user);

        res.json({
            success: true,
            message: `User ${status.toLowerCase()}d successfully`,
            user: {
                ...user,
                status: user.emailVerified ? 'ACTIVE' : 'INACTIVE'
            }
        });

    } catch (error) {
        console.error('Error updating user status:', error);
        next(error);
    }
};

// Export users to CSV
const exportUsers = async (req, res, next) => {
    try {
        console.log('Backend - Exporting users to CSV');

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                country: true,
                phone: true,
                age: true,
                role: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Create CSV content
        const csvHeader = 'ID,Name,Email,Login Method,Status,Country,Phone,Age,Role,Registration Date,Last Login\n';
        const csvRows = users.map(user => {
            const loginMethod = user.password === '' ? 'Google Login' : 'Implanner Login'; // Google users have empty password
            const status = user.emailVerified ? 'Active' : 'Inactive';
            const registrationDate = user.createdAt.toISOString().split('T')[0];
            const lastLogin = user.updatedAt.toISOString().split('T')[0];
            
            return [
                user.id,
                `"${user.name || 'N/A'}"`,
                user.email,
                loginMethod,
                status,
                `"${user.country || 'N/A'}"`,
                `"${user.phone || 'N/A'}"`,
                user.age || 'N/A',
                user.role,
                registrationDate,
                lastLogin
            ].join(',');
        });

        const csvContent = csvHeader + csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
        res.send(csvContent);

        console.log('Backend - CSV export completed');

    } catch (error) {
        console.error('Error exporting users:', error);
        next(error);
    }
};

// Get user statistics
const getUserStats = async (req, res, next) => {
    try {
        console.log('Backend - Fetching user statistics');

        const [
            totalUsers,
            activeUsers,
            googleUsers,
            manualUsers,
            recentUsers
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { emailVerified: true } }),
            prisma.user.count({ where: { password: '' } }), // Google users have empty password
            prisma.user.count({ where: { password: { not: '' } } }), // Manual users have hashed password
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                }
            })
        ]);

        const stats = {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            googleUsers,
            manualUsers,
            recentUsers
        };

        console.log('Backend - User statistics:', stats);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching user statistics:', error);
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    exportUsers,
    getUserStats
};
