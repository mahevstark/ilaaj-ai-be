const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

// Real clinic data with Google Maps URLs (using full URLs)
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

// Sample Google reviews data
const sampleReviews = [
    {
        authorName: "Sarah Johnson",
        authorUrl: "https://www.google.com/maps/contrib/123456789",
        rating: 5,
        text: "Excellent service! The staff was very professional and the dentist was thorough in explaining my treatment options. Highly recommended!",
        time: Math.floor(Date.now() / 1000) - 86400 * 7, // 7 days ago
        relativeTime: "a week ago"
    },
    {
        authorName: "Michael Chen",
        authorUrl: "https://www.google.com/maps/contrib/987654321",
        rating: 4,
        text: "Great experience overall. The office is clean and modern. The only minor issue was the wait time, but the quality of care made up for it.",
        time: Math.floor(Date.now() / 1000) - 86400 * 14, // 14 days ago
        relativeTime: "2 weeks ago"
    },
    {
        authorName: "Emily Rodriguez",
        authorUrl: "https://www.google.com/maps/contrib/456789123",
        rating: 5,
        text: "Outstanding dental care! The team is friendly and knowledgeable. I've been coming here for years and always receive excellent treatment.",
        time: Math.floor(Date.now() / 1000) - 86400 * 21, // 21 days ago
        relativeTime: "3 weeks ago"
    },
    {
        authorName: "David Thompson",
        authorUrl: "https://www.google.com/maps/contrib/789123456",
        rating: 4,
        text: "Professional staff and clean facility. The procedure was painless and the results exceeded my expectations. Will definitely return.",
        time: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
        relativeTime: "a month ago"
    },
    {
        authorName: "Lisa Wang",
        authorUrl: "https://www.google.com/maps/contrib/321654987",
        rating: 5,
        text: "Amazing dental practice! The dentist took time to explain everything and made me feel comfortable throughout the entire process.",
        time: Math.floor(Date.now() / 1000) - 86400 * 45, // 45 days ago
        relativeTime: "a month ago"
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

// Function to generate review statistics
function generateReviewStats(reviews) {
    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
        if (ratingDistribution.hasOwnProperty(rating)) {
            ratingDistribution[rating]++;
        }
    });
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = reviews.filter(review => 
        new Date(review.time * 1000) > thirtyDaysAgo
    ).length;
    
    return {
        totalReviews: reviews.length,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution,
        recentReviews
    };
}

// Function to create clinic with sample data
async function createClinicWithSampleData(clinicData, index) {
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
        
        // Generate sample reviews for this clinic
        const clinicReviews = sampleReviews.map(review => ({
            ...review,
            // Add some variation to make reviews unique
            text: review.text.replace(/dental practice/g, clinicData.name),
            time: review.time - (index * 86400) // Stagger review dates
        }));
        
        const reviewStats = generateReviewStats(clinicReviews);
        
        // Create clinic with sample data
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
                // Google Places data
                googleMapsLink: clinicData.googleMapsLink,
                googleRating: clinicData.googleRating,
                googleReviewCount: clinicData.googleReviewCount,
                googlePlaceId: `ChIJ${Math.random().toString(36).substr(2, 20)}`, // Generate fake place ID
                googleReviews: clinicReviews,
                googleReviewStats: reviewStats,
                lastReviewFetch: new Date(),
                // Additional fields
                description: `Professional dental clinic with ${clinicData.googleRating}/5 star rating and ${clinicData.googleReviewCount} reviews. Located at ${clinicData.address}.`,
                services: ['General Dentistry', 'Implants', 'Crowns', 'Root Canal', 'Fillings', 'Cosmetic Dentistry'],
                specialties: ['Cosmetic Dentistry', 'Restorative Dentistry', 'Preventive Care'],
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
        console.log(`📝 Reviews: ${clinicReviews.length} sample reviews added`);
        
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

// Function to display review summary
function displayReviewSummary(clinic) {
    if (clinic.googleReviews && clinic.googleReviews.length > 0) {
        console.log(`\n📝 Sample Reviews for ${clinic.name}:`);
        clinic.googleReviews.slice(0, 3).forEach((review, index) => {
            console.log(`   ${index + 1}. ${review.authorName} (${review.rating}/5): "${review.text.substring(0, 80)}..."`);
        });
        
        if (clinic.googleReviewStats) {
            console.log(`\n📊 Review Statistics:`);
            console.log(`   Average Rating: ${clinic.googleReviewStats.averageRating}/5`);
            console.log(`   Total Reviews: ${clinic.googleReviewStats.totalReviews}`);
            console.log(`   Recent Reviews (30 days): ${clinic.googleReviewStats.recentReviews}`);
        }
    }
}

// Main seeding function
async function seedClinicsWithSampleData() {
    try {
        console.log('🌱 Starting clinic seeding with sample Google Maps data...');
        console.log('=======================================================');
        
        const createdClinics = [];
        
        // Create each clinic
        for (let i = 0; i < realClinics.length; i++) {
            const clinicData = realClinics[i];
            console.log(`\n🔍 Processing clinic ${i + 1}/${realClinics.length}`);
            
            const clinic = await createClinicWithSampleData(clinicData, i);
            if (clinic) {
                createdClinics.push(clinic);
                displayReviewSummary(clinic);
            }
        }
        
        console.log('\n🎉 Clinic seeding completed!');
        console.log('============================');
        console.log(`✅ Created ${createdClinics.length} clinics with sample Google Maps data`);
        
        // Display summary
        createdClinics.forEach((clinic, index) => {
            console.log(`\n${index + 1}. ${clinic.name}`);
            console.log(`   📍 ${clinic.address}`);
            console.log(`   ⭐ ${clinic.googleRating}/5 (${clinic.googleReviewCount} reviews)`);
            console.log(`   💰 Implant: $${clinic.pricePerImplant/100}, Crown: $${clinic.pricePerCrown/100}`);
            console.log(`   🔗 ${clinic.googleMapsLink}`);
        });
        
        console.log('\n✨ All clinics now have sample Google Maps reviews and ratings!');
        console.log('💡 These clinics can be used to test the Google Places integration');
        
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
if (require.main === module) {
    seedClinicsWithSampleData();
}

module.exports = { seedClinicsWithSampleData };
