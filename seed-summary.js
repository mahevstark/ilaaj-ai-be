const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

// Function to display seeding summary
async function displaySeedingSummary() {
    try {
        console.log('📊 SEEDING SUMMARY REPORT');
        console.log('=========================');
        
        // Get counts
        const userCount = await prisma.user.count();
        const doctorCount = await prisma.doctor.count();
        const clinicCount = await prisma.clinic.count();
        const treatmentCount = await prisma.treatment.count();
        const doctorClinicCount = await prisma.doctorClinic.count();
        
        console.log(`\n👥 Users: ${userCount}`);
        console.log(`👨‍⚕️ Doctors: ${doctorCount}`);
        console.log(`🏥 Clinics: ${clinicCount}`);
        console.log(`🦷 Treatments: ${treatmentCount}`);
        console.log(`🔗 Doctor-Clinic Associations: ${doctorClinicCount}`);
        
        // Display clinics with Google Maps data
        console.log('\n🏥 CLINICS WITH GOOGLE MAPS INTEGRATION');
        console.log('==========================================');
        
        const clinics = await prisma.clinic.findMany({
            where: { status: 'ACTIVE' },
            include: {
                doctors: {
                    include: {
                        doctor: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        clinics.forEach((clinic, index) => {
            console.log(`\n${index + 1}. ${clinic.name}`);
            console.log(`   📍 ${clinic.address}`);
            console.log(`   ⭐ ${clinic.googleRating}/5 (${clinic.googleReviewCount} reviews)`);
            console.log(`   💰 Implant: $${clinic.pricePerImplant/100}, Crown: $${clinic.pricePerCrown/100}`);
            console.log(`   🔗 ${clinic.googleMapsLink}`);
            console.log(`   👨‍⚕️ Doctors: ${clinic.doctors.length}`);
            
            if (clinic.doctors.length > 0) {
                clinic.doctors.forEach(dc => {
                    console.log(`      - Dr. ${dc.doctor.firstName} ${dc.doctor.lastName} (${dc.doctor.specialization.join(', ')})`);
                });
            }
        });
        
        // Display users
        console.log('\n👥 USERS');
        console.log('=========');
        
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        
        users.forEach((user, index) => {
            const loginMethod = user.password === '' ? 'Google Login' : 'Implanner Login';
            console.log(`${index + 1}. ${user.name} (${user.email}) - ${loginMethod}`);
        });
        
        // Display doctors
        console.log('\n👨‍⚕️ DOCTORS');
        console.log('=============');
        
        const doctors = await prisma.doctor.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        doctors.forEach((doctor, index) => {
            console.log(`${index + 1}. Dr. ${doctor.firstName} ${doctor.lastName}`);
            console.log(`   📧 ${doctor.email}`);
            console.log(`   🏥 Specialization: ${doctor.specialization.join(', ')}`);
            console.log(`   📜 Qualifications: ${doctor.qualifications.join(', ')}`);
            console.log(`   ⏰ Experience: ${doctor.experience} years`);
        });
        
        console.log('\n✨ SEEDING COMPLETE!');
        console.log('====================');
        console.log('🎯 The system is now ready with:');
        console.log('   • Real clinic data with Google Maps integration');
        console.log('   • Google ratings and review counts');
        console.log('   • Professional doctors associated with clinics');
        console.log('   • Sample users for testing');
        console.log('   • Treatment options for each clinic');
        console.log('\n💡 Next steps:');
        console.log('   • Test clinic management in admin panel');
        console.log('   • Verify Google Maps links work');
        console.log('   • Test user login and clinic browsing');
        console.log('   • Implement testimonial section with reviews');
        
    } catch (error) {
        console.error('❌ Error displaying summary:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the summary
if (require.main === module) {
    displaySeedingSummary();
}

module.exports = { displaySeedingSummary };
