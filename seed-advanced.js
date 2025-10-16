const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Advanced seed data for comprehensive admin panel testing
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
    },
    {
        email: 'clinic@implanner.com',
        password: 'clinic123',
        name: 'Clinic Manager',
        role: 'ADMIN',
        phone: '+1234567892',
        country: 'Germany',
        contactMethod: 'PHONE',
        age: 38,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    }
];

// Generate realistic patient data with different countries and demographics
const countries = ['United States', 'Canada', 'Turkey', 'Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden'];
const contactMethods = ['EMAIL', 'PHONE', 'WHATSAPP'];

function generateRandomPatient(index) {
    const firstNames = ['John', 'Jane', 'Ahmed', 'Maria', 'David', 'Sarah', 'Mohammed', 'Anna', 'Michael', 'Lisa', 'Carlos', 'Emma', 'Ali', 'Sophie', 'James'];
    const lastNames = ['Doe', 'Smith', 'Hassan', 'Garcia', 'Wilson', 'Brown', 'Johnson', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Jackson'];
    
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const country = countries[index % countries.length];
    const contactMethod = contactMethods[index % contactMethods.length];
    const age = 25 + (index % 30); // Ages 25-54
    
    return {
        email: `patient${index + 1}@example.com`,
        password: 'patient123',
        name: `${firstName} ${lastName}`,
        role: 'PATIENT',
        phone: `+12345678${String(index + 10).padStart(2, '0')}`,
        country,
        contactMethod,
        age,
        gdprConsent: true,
        kvkkConsent: true,
        emailVerified: true
    };
}

// Generate 20 sample patients
const samplePatients = Array.from({ length: 20 }, (_, index) => generateRandomPatient(index));

// Generate diverse medical histories
const medicalConditions = [
    { boneLoss: false, smoking: false, diseases: 'None' },
    { boneLoss: true, smoking: false, diseases: 'None' },
    { boneLoss: false, smoking: true, diseases: 'None' },
    { boneLoss: true, smoking: true, diseases: 'None' },
    { boneLoss: false, smoking: false, diseases: 'Diabetes Type 2' },
    { boneLoss: true, smoking: false, diseases: 'Hypertension' },
    { boneLoss: false, smoking: true, diseases: 'Arthritis' },
    { boneLoss: true, smoking: true, diseases: 'Heart Disease' },
    { boneLoss: false, smoking: false, diseases: 'Osteoporosis' },
    { boneLoss: true, smoking: false, diseases: 'Multiple Conditions' }
];

// Generate diverse treatment plans
const treatmentTemplates = [
    {
        source: 'xray',
        title: 'Upper Jaw Implant Treatment',
        summary: 'Comprehensive treatment plan for upper jaw dental implants with excellent bone density',
        hasXRay: true,
        hasExistingPlan: false,
        budgetCents: 500000,
        selectedTeeth: [11, 12, 13, 14, 15, 16, 17, 18],
        implants: 6,
        crowns: 8,
        fillings: 2,
        rootCanals: 1,
        xrayUrl: 'https://res.cloudinary.com/sample/xray1.jpg',
        analysisJson: {
            analysisId: 'analysis_001',
            confidence: 0.95,
            findings: ['Missing teeth in upper jaw', 'Good bone density', 'No complications detected'],
            recommendations: ['6 implants recommended', 'Bone grafting not required', 'Estimated success rate: 95%']
        }
    },
    {
        source: 'form',
        hasXRay: false,
        hasExistingPlan: true,
        budgetCents: 300000,
        selectedTeeth: [21, 22, 23, 24, 25, 26, 27, 28],
        implants: 4,
        crowns: 6,
        fillings: 3,
        rootCanals: 0
    },
    {
        source: 'xray',
        title: 'Full Mouth Reconstruction',
        summary: 'Complete dental restoration with implants and crowns for comprehensive oral health',
        hasXRay: true,
        hasExistingPlan: false,
        budgetCents: 800000,
        selectedTeeth: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28],
        implants: 12,
        crowns: 16,
        fillings: 4,
        rootCanals: 2,
        xrayUrl: 'https://res.cloudinary.com/sample/xray2.jpg',
        analysisJson: {
            analysisId: 'analysis_002',
            confidence: 0.92,
            findings: ['Multiple missing teeth', 'Moderate bone loss', 'Some areas need attention'],
            recommendations: ['12 implants recommended', 'Bone grafting required for some areas', 'Staged treatment approach']
        }
    },
    {
        source: 'form',
        hasXRay: false,
        hasExistingPlan: false,
        budgetCents: 200000,
        selectedTeeth: [31, 32, 33, 34, 35, 36, 37, 38],
        implants: 3,
        crowns: 5,
        fillings: 1,
        rootCanals: 0
    },
    {
        source: 'xray',
        title: 'Lower Jaw Implant Treatment',
        summary: 'Lower jaw dental implant treatment with focus on molars and premolars',
        hasXRay: true,
        hasExistingPlan: true,
        budgetCents: 400000,
        selectedTeeth: [31, 32, 33, 34, 35, 36, 37, 38],
        implants: 5,
        crowns: 7,
        fillings: 2,
        rootCanals: 1,
        xrayUrl: 'https://res.cloudinary.com/sample/xray3.jpg',
        analysisJson: {
            analysisId: 'analysis_003',
            confidence: 0.88,
            findings: ['Missing molars in lower jaw', 'Good bone structure', 'Minor complications'],
            recommendations: ['5 implants recommended', 'No bone grafting needed', 'Follow-up required']
        }
    },
    {
        source: 'xray',
        title: 'Anterior Teeth Restoration',
        summary: 'Front teeth restoration with aesthetic focus and natural appearance',
        hasXRay: true,
        hasExistingPlan: false,
        budgetCents: 350000,
        selectedTeeth: [11, 12, 13, 21, 22, 23],
        implants: 4,
        crowns: 6,
        fillings: 0,
        rootCanals: 0,
        xrayUrl: 'https://res.cloudinary.com/sample/xray4.jpg',
        analysisJson: {
            analysisId: 'analysis_004',
            confidence: 0.97,
            findings: ['Anterior teeth missing', 'Excellent bone quality', 'Perfect for aesthetic restoration'],
            recommendations: ['4 implants recommended', 'High-quality materials suggested', 'Excellent prognosis']
        }
    }
];

// Generate diverse questionnaires
const questionnaireTemplates = [
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
    },
    {
        age: 52,
        boneLoss: true,
        smoking: false,
        chronicDiseases: 'Diabetes',
        budgetPreference: '10000+',
        medicalCondition: 'Well-controlled diabetes'
    },
    {
        age: 35,
        boneLoss: false,
        smoking: true,
        chronicDiseases: 'None',
        budgetPreference: '5000-10000',
        medicalCondition: 'Good health, occasional smoker'
    },
    {
        age: 41,
        boneLoss: true,
        smoking: false,
        chronicDiseases: 'Osteoporosis',
        budgetPreference: '10000+',
        medicalCondition: 'Osteoporosis, requires special care'
    }
];

async function hashPassword(password) {
    const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 6 : 8;
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function seedAdvancedDatabase() {
    try {
        console.log('🌱 Starting advanced database seeding...');

        // Clear existing data
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
            const medicalHistory = medicalConditions[i % medicalConditions.length];
            
            await prisma.medicalHistory.create({
                data: {
                    userId: patient.id,
                    boneLossHistory: medicalHistory.boneLoss,
                    smoking: medicalHistory.smoking,
                    chronicDiseases: medicalHistory.diseases
                }
            });
            console.log(`✅ Created medical history for: ${patient.email}`);
        }

        // Create treatment plans for patients (some patients get multiple plans)
        console.log('🦷 Creating treatment plans...');
        for (let i = 0; i < createdPatients.length; i++) {
            const patient = createdPatients[i];
            const numPlans = Math.random() > 0.7 ? 2 : 1; // 30% chance of multiple plans
            
            for (let j = 0; j < numPlans; j++) {
                const treatmentPlan = treatmentTemplates[(i + j) % treatmentTemplates.length];
                
                const createdPlan = await prisma.treatmentPlan.create({
                    data: {
                        userId: patient.id,
                        ...treatmentPlan
                    }
                });
                console.log(`✅ Created treatment plan ${j + 1} for: ${patient.email}`);

                // Create questionnaire linked to treatment plan
                const questionnaire = questionnaireTemplates[(i + j) % questionnaireTemplates.length];
                await prisma.questionnaire.create({
                    data: {
                        userId: patient.id,
                        planId: createdPlan.id,
                        ...questionnaire
                    }
                });
                console.log(`✅ Created questionnaire ${j + 1} for: ${patient.email}`);
            }
        }

        // Create additional treatment plans for some patients (to show variety)
        console.log('🦷 Creating additional treatment plans...');
        const additionalPatients = createdPatients.slice(0, Math.floor(createdPatients.length * 0.3));
        for (let i = 0; i < additionalPatients.length; i++) {
            const patient = additionalPatients[i];
            const additionalPlan = treatmentTemplates[(i + 5) % treatmentTemplates.length];
            
            await prisma.treatmentPlan.create({
                data: {
                    userId: patient.id,
                    ...additionalPlan
                }
            });
            console.log(`✅ Created additional treatment plan for: ${patient.email}`);
        }

        // Display comprehensive summary
        console.log('\n📊 Advanced Seeding Summary:');
        const totalUsers = await prisma.user.count();
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
        const totalPatients = await prisma.user.count({ where: { role: 'PATIENT' } });
        const totalTreatmentPlans = await prisma.treatmentPlan.count();
        const totalQuestionnaires = await prisma.questionnaire.count();
        const totalMedicalHistories = await prisma.medicalHistory.count();

        // Country distribution
        const countryStats = await prisma.user.groupBy({
            by: ['country'],
            where: { role: 'PATIENT' },
            _count: { country: true }
        });

        // Treatment plan source distribution
        const sourceStats = await prisma.treatmentPlan.groupBy({
            by: ['source'],
            _count: { source: true }
        });

        console.log(`👑 Admin users: ${totalAdmins}`);
        console.log(`👥 Patient users: ${totalPatients}`);
        console.log(`🦷 Treatment plans: ${totalTreatmentPlans}`);
        console.log(`📋 Questionnaires: ${totalQuestionnaires}`);
        console.log(`🏥 Medical histories: ${totalMedicalHistories}`);
        console.log(`📊 Total users: ${totalUsers}`);

        console.log('\n🌍 Country Distribution:');
        countryStats.forEach(stat => {
            console.log(`  ${stat.country}: ${stat._count.country} patients`);
        });

        console.log('\n📊 Treatment Plan Sources:');
        sourceStats.forEach(stat => {
            console.log(`  ${stat.source}: ${stat._count.source} plans`);
        });

        console.log('\n🎉 Advanced database seeding completed successfully!');
        console.log('\n🔑 Admin Login Credentials:');
        console.log('Email: admin@implanner.com | Password: admin123');
        console.log('Email: superadmin@implanner.com | Password: superadmin123');
        console.log('Email: clinic@implanner.com | Password: clinic123');
        console.log('\n👥 Sample Patient Credentials (first 5):');
        for (let i = 0; i < Math.min(5, samplePatients.length); i++) {
            console.log(`Email: ${samplePatients[i].email} | Password: patient123`);
        }
        console.log(`... and ${Math.max(0, samplePatients.length - 5)} more patients`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the advanced seed function
if (require.main === module) {
    seedAdvancedDatabase()
        .then(() => {
            console.log('✅ Advanced seed script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Advanced seed script failed:', error);
            process.exit(1);
        });
}

module.exports = { seedAdvancedDatabase };
