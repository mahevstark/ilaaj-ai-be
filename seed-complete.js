const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Sample users data
const users = [
    {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "password123",
        role: "PATIENT",
        phone: "+1 (555) 123-4567",
        country: "USA",
        age: 35
    },
    {
        name: "Jane Smith",
        email: "jane.smith@example.com", 
        password: "password123",
        role: "PATIENT",
        phone: "+1 (555) 234-5678",
        country: "USA",
        age: 28
    },
    {
        name: "Admin User",
        email: "admin@implanner.com",
        password: "admin123",
        role: "ADMIN",
        phone: "+1 (555) 999-0000",
        country: "USA",
        age: 40
    },
    {
        name: "Ammar Ahmad",
        email: "ammarahmad5002@gmail.com",
        password: "",
        role: "PATIENT",
        phone: "+1 (555) 111-2222",
        country: "Pakistan",
        age: 25
    },
    {
        name: "Hassan Maqsood",
        email: "hassanmaqsood5002@gmail.com",
        password: "",
        role: "PATIENT",
        phone: "+1 (555) 333-4444",
        country: "Pakistan",
        age: 30
    }
];

// Sample doctors data
const doctors = [
    {
        firstName: "Dr. Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@downtowndental.com",
        phone: "+1 (555) 100-2000",
        specialization: ["General Dentistry", "Cosmetic Dentistry"],
        qualifications: ["DDS", "MS in Oral Surgery"],
        experience: 10,
        licenseNumber: "DENT-001",
        bio: "Experienced dentist with 10 years of practice in general and cosmetic dentistry."
    },
    {
        firstName: "Dr. Michael",
        lastName: "Chen",
        email: "michael.chen@metrodental.com",
        phone: "+1 (555) 200-3000",
        specialization: ["Orthodontics", "Pediatric Dentistry"],
        qualifications: ["DDS", "MS in Orthodontics"],
        experience: 8,
        licenseNumber: "DENT-002",
        bio: "Specialized in orthodontics and pediatric dentistry with 8 years of experience."
    },
    {
        firstName: "Dr. Emily",
        lastName: "Rodriguez",
        email: "emily.rodriguez@elitedental.com",
        phone: "+1 (555) 300-4000",
        specialization: ["Oral Surgery", "Implant Dentistry"],
        qualifications: ["DDS", "MS in Oral Surgery"],
        experience: 12,
        licenseNumber: "DENT-003",
        bio: "Expert in oral surgery and implant dentistry with 12 years of experience."
    }
];

// Function to hash password
async function hashPassword(password) {
    if (!password) return '';
    return await bcrypt.hash(password, 10);
}

// Function to create users
async function createUsers() {
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of users) {
        try {
            const hashedPassword = await hashPassword(userData.password);
            
            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                    phone: userData.phone,
                    country: userData.country,
                    age: userData.age,
                    emailVerified: true
                }
            });
            
            console.log(`✅ Created user: ${user.name} (${user.email})`);
            createdUsers.push(user);
        } catch (error) {
            console.log(`⚠️ User ${userData.email} might already exist`);
        }
    }
    
    return createdUsers;
}

// Function to create doctors
async function createDoctors() {
    console.log('\n👨‍⚕️ Creating doctors...');
    const createdDoctors = [];
    
    for (const doctorData of doctors) {
        try {
            const doctor = await prisma.doctor.create({
                data: {
                    firstName: doctorData.firstName,
                    lastName: doctorData.lastName,
                    email: doctorData.email,
                    phone: doctorData.phone,
                    specialization: doctorData.specialization,
                    qualifications: doctorData.qualifications,
                    experience: doctorData.experience,
                    licenseNumber: doctorData.licenseNumber,
                    bio: doctorData.bio,
                    status: 'ACTIVE'
                }
            });
            
            console.log(`✅ Created doctor: ${doctor.firstName} ${doctor.lastName}`);
            createdDoctors.push(doctor);
        } catch (error) {
            console.log(`⚠️ Doctor ${doctorData.email} might already exist`);
        }
    }
    
    return createdDoctors;
}

// Function to associate doctors with clinics
async function associateDoctorsWithClinics(doctors, clinics) {
    console.log('\n🔗 Associating doctors with clinics...');
    
    for (let i = 0; i < doctors.length && i < clinics.length; i++) {
        try {
            await prisma.doctorClinic.create({
                data: {
                    doctorId: doctors[i].id,
                    clinicId: clinics[i].id,
                    role: 'OWNER',
                    status: 'ACTIVE',
                    startDate: new Date()
                }
            });
            
            console.log(`✅ Associated Dr. ${doctors[i].firstName} ${doctors[i].lastName} with ${clinics[i].name}`);
        } catch (error) {
            console.log(`⚠️ Association might already exist`);
        }
    }
}

// Function to create sample treatments
async function createTreatments(clinics) {
    console.log('\n🦷 Creating treatments...');
    
    const treatments = [
        { name: "Dental Implant", description: "Single tooth replacement with titanium implant", category: "IMPLANT" },
        { name: "Dental Crown", description: "Porcelain crown for tooth restoration", category: "CROWN" },
        { name: "Root Canal", description: "Endodontic treatment to save infected tooth", category: "ROOT_CANAL" },
        { name: "Dental Filling", description: "Composite filling for cavity treatment", category: "FILLING" }
    ];
    
    const createdTreatments = [];
    
    for (const treatmentData of treatments) {
        for (const clinic of clinics) {
            try {
                const treatment = await prisma.treatment.create({
                    data: {
                        name: treatmentData.name,
                        description: treatmentData.description,
                        category: treatmentData.category,
                        clinicId: clinic.id,
                        isActive: true
                    }
                });
                
                createdTreatments.push(treatment);
            } catch (error) {
                // Treatment might already exist
            }
        }
    }
    
    console.log(`✅ Created ${createdTreatments.length} treatments across all clinics`);
    return createdTreatments;
}

// Main seeding function
async function seedCompleteData() {
    try {
        console.log('🌱 Starting complete data seeding...');
        console.log('=====================================');
        
        // Create users
        const users = await createUsers();
        
        // Create doctors
        const doctors = await createDoctors();
        
        // Get existing clinics
        const clinics = await prisma.clinic.findMany({
            where: { status: 'ACTIVE' }
        });
        
        console.log(`\n🏥 Found ${clinics.length} existing clinics`);
        
        // Associate doctors with clinics
        await associateDoctorsWithClinics(doctors, clinics);
        
        // Create treatments
        await createTreatments(clinics);
        
        console.log('\n🎉 Complete data seeding finished!');
        console.log('===================================');
        console.log(`✅ Users: ${users.length}`);
        console.log(`✅ Doctors: ${doctors.length}`);
        console.log(`✅ Clinics: ${clinics.length}`);
        console.log(`✅ Doctor-Clinic associations created`);
        console.log(`✅ Treatments created for all clinics`);
        
        console.log('\n📊 System Summary:');
        console.log('==================');
        console.log('👥 Users can now log in and browse clinics');
        console.log('🏥 Clinics have Google Maps integration ready');
        console.log('👨‍⚕️ Doctors are associated with clinics');
        console.log('🦷 Treatments are available for each clinic');
        console.log('⭐ Google ratings and reviews are displayed');
        
    } catch (error) {
        console.error('❌ Error during complete seeding:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
if (require.main === module) {
    seedCompleteData();
}

module.exports = { seedCompleteData };
