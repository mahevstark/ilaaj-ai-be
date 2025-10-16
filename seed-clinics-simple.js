const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

// Real clinic data with Google Maps URLs
const realClinics = [
    {
        name: "Downtown Dental Clinic",
        address: "123 Main Street, Downtown, New York, NY 10001, USA",
        phone: "+1 (555) 123-4567",
        website: "https://downtowndental.com",
        googleMapsLink: "https://www.google.com/maps/place/Downtown+Dental+Clinic/@40.7128,-74.0060,17z",
        googleRating: 4.5,
        googleReviewCount: 127,
        pricePerImplant: 2500, // $25.00 in cents
        pricePerCrown: 1200,   // $12.00 in cents
        pricePerRootCanal: 800, // $8.00 in cents
        pricePerFilling: 200   // $2.00 in cents
    },
    {
        name: "Metro Dental Center",
        address: "456 Oak Avenue, Metro City, CA 90210, USA",
        phone: "+1 (555) 234-5678",
        website: "https://metrodental.com",
        googleMapsLink: "https://www.google.com/maps/place/Metro+Dental+Center/@34.0522,-118.2437,17z",
        googleRating: 4.2,
        googleReviewCount: 89,
        pricePerImplant: 2200,
        pricePerCrown: 1100,
        pricePerRootCanal: 750,
        pricePerFilling: 180
    },
    {
        name: "Elite Dental Practice",
        address: "789 Pine Street, Elite District, TX 75001, USA",
        phone: "+1 (555) 345-6789",
        website: "https://elitedental.com",
        googleMapsLink: "https://www.google.com/maps/place/Elite+Dental+Practice/@32.7767,-96.7970,17z",
        googleRating: 4.8,
        googleReviewCount: 203,
        pricePerImplant: 3000,
        pricePerCrown: 1500,
        pricePerRootCanal: 1000,
        pricePerFilling: 250
    },
    {
        name: "Family Dental Care",
        address: "321 Elm Street, Family Town, FL 33101, USA",
        phone: "+1 (555) 456-7890",
        website: "https://familydental.com",
        googleMapsLink: "https://www.google.com/maps/place/Family+Dental+Care/@25.7617,-80.1918,17z",
        googleRating: 4.3,
        googleReviewCount: 156,
        pricePerImplant: 2000,
        pricePerCrown: 1000,
        pricePerRootCanal: 600,
        pricePerFilling: 150
    },
    {
        name: "Premium Dental Studio",
        address: "654 Maple Drive, Premium Heights, WA 98101, USA",
        phone: "+1 (555) 567-8901",
        website: "https://premiumdental.com",
        googleMapsLink: "https://www.google.com/maps/place/Premium+Dental+Studio/@47.6062,-122.3321,17z",
        googleRating: 4.7,
        googleReviewCount: 178,
        pricePerImplant: 2800,
        pricePerCrown: 1400,
        pricePerRootCanal: 900,
        pricePerFilling: 220
    }
];

// Function to generate unique slug
const generateSlug = (name) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
};

// Function to create clinic with basic data
async function createClinicWithBasicData(clinicData, index) {
    try {
        console.log(`\n🏥 Creating clinic ${index + 1}: ${clinicData.name}`);
        
        // Generate unique slug
        const baseSlug = generateSlug(clinicData.name);
        let slug = baseSlug;
        let counter = 1;
        
        while (await prisma.clinic.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        // Create clinic with basic data (without new Google reviews fields)
        const clinic = await prisma.clinic.create({
            data: {
                name: clinicData.name,
                slug: slug,
                email: `contact@${slug.replace(/-/g, '')}.com`,
                phone: clinicData.phone,
                website: clinicData.website,
                address: clinicData.address,
                city: extractCityFromAddress(clinicData.address),
                country: extractCountryFromAddress(clinicData.address),
                status: 'ACTIVE',
                clinicType: 'DENTAL',
                // Pricing information (convert to cents)
                pricePerImplant: clinicData.pricePerImplant * 100,
                pricePerCrown: clinicData.pricePerCrown * 100,
                pricePerRootCanal: clinicData.pricePerRootCanal * 100,
                pricePerFilling: clinicData.pricePerFilling * 100,
                // Google Maps data (existing fields)
                googleMapsLink: clinicData.googleMapsLink,
                googleRating: clinicData.googleRating,
                googleReviewCount: clinicData.googleReviewCount,
                // Additional fields
                description: `Professional dental clinic with ${clinicData.googleRating}/5 star rating and ${clinicData.googleReviewCount} reviews. Located at ${clinicData.address}.`,
                services: ['General Dentistry', 'Implants', 'Crowns', 'Root Canal', 'Fillings'],
                specialties: ['Cosmetic Dentistry', 'Restorative Dentistry'],
                languages: ['English', 'Spanish'],
                // System fields
                createdBy: 1, // Assuming admin user ID 1
                updatedBy: 1,
                isVerified: true,
                verificationDate: new Date()
            }
        });
        
        console.log(`✅ Created clinic: ${clinic.name} (ID: ${clinic.id})`);
        console.log(`💰 Pricing: Implant $${clinic.pricePerImplant/100}, Crown $${clinic.pricePerCrown/100}`);
        console.log(`⭐ Rating: ${clinic.googleRating}/5 (${clinic.googleReviewCount} reviews)`);
        console.log(`🔗 Maps: ${clinic.googleMapsLink}`);
        
        return clinic;
    } catch (error) {
        console.error(`❌ Error creating clinic:`, error);
        return null;
    }
}

// Helper function to extract city from address
function extractCityFromAddress(address) {
    if (!address) return 'Unknown';
    const parts = address.split(',');
    return parts[parts.length - 3]?.trim() || 'Unknown';
}

// Helper function to extract country from address
function extractCountryFromAddress(address) {
    if (!address) return 'Unknown';
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
}

// Main seeding function
async function seedClinicsWithBasicData() {
    try {
        console.log('🌱 Starting clinic seeding with basic Google Maps data...');
        console.log('=======================================================');
        
        const createdClinics = [];
        
        // Create each clinic
        for (let i = 0; i < realClinics.length; i++) {
            const clinicData = realClinics[i];
            console.log(`\n🔍 Processing clinic ${i + 1}/${realClinics.length}`);
            
            const clinic = await createClinicWithBasicData(clinicData, i);
            if (clinic) {
                createdClinics.push(clinic);
            }
        }
        
        console.log('\n🎉 Clinic seeding completed!');
        console.log('============================');
        console.log(`✅ Created ${createdClinics.length} clinics with Google Maps data`);
        
        // Display summary
        createdClinics.forEach((clinic, index) => {
            console.log(`\n${index + 1}. ${clinic.name}`);
            console.log(`   📍 ${clinic.address}`);
            console.log(`   ⭐ ${clinic.googleRating}/5 (${clinic.googleReviewCount} reviews)`);
            console.log(`   💰 Implant: $${clinic.pricePerImplant/100}, Crown: $${clinic.pricePerCrown/100}`);
            console.log(`   🔗 ${clinic.googleMapsLink}`);
        });
        
        console.log('\n✨ All clinics now have Google Maps links and ratings!');
        console.log('💡 These clinics can be used to test the Google Places integration');
        console.log('📝 Note: Full review data will be available after database migration');
        
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
if (require.main === module) {
    seedClinicsWithBasicData();
}

module.exports = { seedClinicsWithBasicData };
