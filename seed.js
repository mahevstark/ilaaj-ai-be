const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Sample data for seeding
const adminUsers = [
    {
        email: 'admin@implanner.com',
        password: 'admin123',
        name: 'Super Admin',
        role: 'ADMIN',
        phone: '+1234567890',
        country: 'United States',
        contactMethod: 'EMAIL',
        age: 35,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    },
    {
        email: 'superadmin@implanner.com',
        password: 'superadmin123',
        name: 'Super Admin',
        role: 'ADMIN',
        phone: '+1234567891',
        country: 'Turkey',
        contactMethod: 'EMAIL',
        age: 40,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    }
];

const samplePatients = [
    {
        email: 'patient1@example.com',
        password: 'patient123',
        name: 'John Doe',
        role: 'PATIENT',
        phone: '+1234567892',
        country: 'United States',
        contactMethod: 'EMAIL',
        age: 28,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    },
    {
        email: 'patient2@example.com',
        password: 'patient123',
        name: 'Jane Smith',
        role: 'PATIENT',
        phone: '+1234567893',
        country: 'Canada',
        contactMethod: 'PHONE',
        age: 32,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    },
    {
        email: 'patient3@example.com',
        password: 'patient123',
        name: 'Ahmed Hassan',
        role: 'PATIENT',
        phone: '+1234567894',
        country: 'Turkey',
        contactMethod: 'WHATSAPP',
        age: 45,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    },
    {
        email: 'patient4@example.com',
        password: 'patient123',
        name: 'Maria Garcia',
        role: 'PATIENT',
        phone: '+1234567895',
        country: 'Germany',
        contactMethod: 'EMAIL',
        age: 38,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    },
    {
        email: 'patient5@example.com',
        password: 'patient123',
        name: 'David Wilson',
        role: 'PATIENT',
        phone: '+1234567896',
        country: 'United Kingdom',
        contactMethod: 'PHONE',
        age: 29,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    }
];

const sampleMedicalHistories = [
    {
        boneLossHistory: true,
        smoking: false,
        chronicDiseases: 'Diabetes Type 2'
    },
    {
        boneLossHistory: false,
        smoking: true,
        chronicDiseases: 'Hypertension'
    },
    {
        boneLossHistory: true,
        smoking: true,
        chronicDiseases: 'None'
    },
    {
        boneLossHistory: false,
        smoking: false,
        chronicDiseases: 'Arthritis'
    },
    {
        boneLossHistory: true,
        smoking: false,
        chronicDiseases: 'None'
    }
];

const sampleTreatmentPlans = [
    {
        source: 'xray',
        title: 'Upper Jaw Implant Treatment',
        summary: 'Comprehensive treatment plan for upper jaw dental implants',
        hasXRay: true,
        hasExistingPlan: false,
        budgetCents: 500000, // $5000
        selectedTeeth: [11, 12, 13, 14, 15, 16, 17, 18],
        implants: 6,
        crowns: 8,
        fillings: 2,
        rootCanals: 1,
        xrayUrl: 'https://res.cloudinary.com/sample/xray1.jpg',
        analysisJson: {
            analysisId: 'analysis_001',
            confidence: 0.95,
            findings: ['Missing teeth in upper jaw', 'Good bone density'],
            recommendations: ['6 implants recommended', 'Bone grafting not required']
        }
    },
    {
        source: 'form',
        hasXRay: false,
        hasExistingPlan: true,
        budgetCents: 300000, // $3000
        selectedTeeth: [21, 22, 23, 24, 25, 26, 27, 28],
        implants: 4,
        crowns: 6,
        fillings: 3,
        rootCanals: 0
    },
    {
        source: 'xray',
        title: 'Full Mouth Reconstruction',
        summary: 'Complete dental restoration with implants and crowns',
        hasXRay: true,
        hasExistingPlan: false,
        budgetCents: 800000, // $8000
        selectedTeeth: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28],
        implants: 12,
        crowns: 16,
        fillings: 4,
        rootCanals: 2,
        xrayUrl: 'https://res.cloudinary.com/sample/xray2.jpg',
        analysisJson: {
            analysisId: 'analysis_002',
            confidence: 0.92,
            findings: ['Multiple missing teeth', 'Moderate bone loss'],
            recommendations: ['12 implants recommended', 'Bone grafting required for some areas']
        }
    },
    {
        source: 'form',
        hasXRay: false,
        hasExistingPlan: false,
        budgetCents: 200000, // $2000
        selectedTeeth: [31, 32, 33, 34, 35, 36, 37, 38],
        implants: 3,
        crowns: 5,
        fillings: 1,
        rootCanals: 0
    },
    {
        source: 'xray',
        title: 'Lower Jaw Implant Treatment',
        summary: 'Lower jaw dental implant treatment plan',
        hasXRay: true,
        hasExistingPlan: true,
        budgetCents: 400000, // $4000
        selectedTeeth: [31, 32, 33, 34, 35, 36, 37, 38],
        implants: 5,
        crowns: 7,
        fillings: 2,
        rootCanals: 1,
        xrayUrl: 'https://res.cloudinary.com/sample/xray3.jpg',
        analysisJson: {
            analysisId: 'analysis_003',
            confidence: 0.88,
            findings: ['Missing molars in lower jaw', 'Good bone structure'],
            recommendations: ['5 implants recommended', 'No bone grafting needed']
        }
    }
];

const sampleQuestionnaires = [
    {
        age: 28,
        boneLoss: false,
        smoking: false,
        chronicDiseases: 'None',
        budgetPreference: '5000-10000',
        medicalCondition: 'Good overall health'
    },
    {
        age: 32,
        boneLoss: true,
        smoking: true,
        chronicDiseases: 'Hypertension',
        budgetPreference: '3000-5000',
        medicalCondition: 'Controlled hypertension'
    },
    {
        age: 45,
        boneLoss: true,
        smoking: true,
        chronicDiseases: 'None',
        budgetPreference: '10000+',
        medicalCondition: 'Good health, regular smoker'
    },
    {
        age: 38,
        boneLoss: false,
        smoking: false,
        chronicDiseases: 'Arthritis',
        budgetPreference: '5000-10000',
        medicalCondition: 'Mild arthritis, well managed'
    },
    {
        age: 29,
        boneLoss: true,
        smoking: false,
        chronicDiseases: 'None',
        budgetPreference: '3000-5000',
        medicalCondition: 'Excellent health'
    }
];

async function hashPassword(password) {
    const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 6 : 8;
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🧹 Clearing existing data...');
        await prisma.questionnaire.deleteMany();
        await prisma.treatmentPlan.deleteMany();
        await prisma.medicalHistory.deleteMany();
        await prisma.user.deleteMany();

        // Create admin users
        console.log('👑 Creating admin users...');
        for (const adminData of adminUsers) {
            const hashedPassword = await hashPassword(adminData.password);
            const admin = await prisma.user.create({
                data: {
                    ...adminData,
                    password: hashedPassword
                }
            });
            console.log(`✅ Created admin: ${admin.email}`);
        }

        // Create sample patients
        console.log('👥 Creating sample patients...');
        const createdPatients = [];
        for (const patientData of samplePatients) {
            const hashedPassword = await hashPassword(patientData.password);
            const patient = await prisma.user.create({
                data: {
                    ...patientData,
                    password: hashedPassword
                }
            });
            createdPatients.push(patient);
            console.log(`✅ Created patient: ${patient.email}`);
        }

        // Create medical histories for patients
        console.log('🏥 Creating medical histories...');
        for (let i = 0; i < createdPatients.length; i++) {
            const patient = createdPatients[i];
            const medicalHistory = sampleMedicalHistories[i % sampleMedicalHistories.length];
            
            await prisma.medicalHistory.create({
                data: {
                    userId: patient.id,
                    ...medicalHistory
                }
            });
            console.log(`✅ Created medical history for: ${patient.email}`);
        }

        // Create treatment plans for patients
        console.log('🦷 Creating treatment plans...');
        for (let i = 0; i < createdPatients.length; i++) {
            const patient = createdPatients[i];
            const treatmentPlan = sampleTreatmentPlans[i % sampleTreatmentPlans.length];
            
            const createdPlan = await prisma.treatmentPlan.create({
                data: {
                    userId: patient.id,
                    ...treatmentPlan
                }
            });
            console.log(`✅ Created treatment plan for: ${patient.email}`);

            // Create questionnaire linked to treatment plan
            const questionnaire = sampleQuestionnaires[i % sampleQuestionnaires.length];
            await prisma.questionnaire.create({
                data: {
                    userId: patient.id,
                    planId: createdPlan.id,
                    ...questionnaire
                }
            });
            console.log(`✅ Created questionnaire for: ${patient.email}`);
        }

        // Create additional treatment plans for some patients (to show multiple plans)
        console.log('🦷 Creating additional treatment plans...');
        for (let i = 0; i < Math.min(3, createdPatients.length); i++) {
            const patient = createdPatients[i];
            const additionalPlan = sampleTreatmentPlans[(i + 2) % sampleTreatmentPlans.length];
            
            await prisma.treatmentPlan.create({
                data: {
                    userId: patient.id,
                    ...additionalPlan
                }
            });
            console.log(`✅ Created additional treatment plan for: ${patient.email}`);
        }

        // Display summary
        console.log('\n📊 Seeding Summary:');
        const totalUsers = await prisma.user.count();
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
        const totalPatients = await prisma.user.count({ where: { role: 'PATIENT' } });
        const totalTreatmentPlans = await prisma.treatmentPlan.count();
        const totalQuestionnaires = await prisma.questionnaire.count();
        const totalMedicalHistories = await prisma.medicalHistory.count();

        console.log(`👑 Admin users: ${totalAdmins}`);
        console.log(`👥 Patient users: ${totalPatients}`);
        console.log(`🦷 Treatment plans: ${totalTreatmentPlans}`);
        console.log(`📋 Questionnaires: ${totalQuestionnaires}`);
        console.log(`🏥 Medical histories: ${totalMedicalHistories}`);
        console.log(`📊 Total users: ${totalUsers}`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n🔑 Admin Login Credentials:');
        console.log('Email: admin@implanner.com | Password: admin123');
        console.log('Email: superadmin@implanner.com | Password: superadmin123');
        console.log('\n👥 Sample Patient Credentials:');
        console.log('Email: patient1@example.com | Password: patient123');
        console.log('Email: patient2@example.com | Password: patient123');
        console.log('Email: patient3@example.com | Password: patient123');
        console.log('Email: patient4@example.com | Password: patient123');
        console.log('Email: patient5@example.com | Password: patient123');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('✅ Seed script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seed script failed:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
