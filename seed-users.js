const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting user seeding...');

    try {
        // Create test users
        const testUsers = [
            {
                name: 'John Doe',
                email: 'john.doe@example.com',
                password: await bcrypt.hash('password123', 12),
                role: 'PATIENT',
                phone: '+1234567890',
                country: 'United States',
                age: 30,
                emailVerified: true
            },
            {
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                password: await bcrypt.hash('password123', 12),
                role: 'PATIENT',
                phone: '+1234567891',
                country: 'Canada',
                age: 28,
                emailVerified: true
            },
            {
                name: 'Admin User',
                email: 'admin@implanner.com',
                password: await bcrypt.hash('admin123', 12),
                role: 'ADMIN',
                phone: '+1234567892',
                country: 'Turkey',
                age: 35,
                emailVerified: true
            }
        ];

        for (const userData of testUsers) {
            try {
                const user = await prisma.user.create({
                    data: userData
                });
                console.log(`✅ Created user: ${user.name} (${user.email})`);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log(`⚠️  User ${userData.email} already exists, skipping...`);
                } else {
                    console.error(`❌ Error creating user ${userData.email}:`, error.message);
                }
            }
        }

        console.log('🎉 User seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during user seeding:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    });
