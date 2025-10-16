const { PrismaClient } = require('./generated/prisma');
const googlePlacesService = require('./services/googlePlaces.service');

const prisma = new PrismaClient();

// Google Maps URLs provided by user
const clinicUrls = [
    'https://maps.app.goo.gl/Q7wKBU16Hd8GKLV29',
    'https://maps.app.goo.gl/iNTH9SH532akwpWh8', 
    'https://maps.app.goo.gl/noU5RpDriH4FXo3C7',
    'https://maps.app.goo.gl/kYhgbGME1aZayotK9',
    'https://maps.app.goo.gl/KmBQpMG2d11KUcLB9'
];

// Function to generate unique slug
const generateSlug = (name, city, country) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
};

// Function to fetch clinic data from Google Places
async function fetchClinicData(url, index) {
    try {
        console.log(`\n🔍 Fetching data for clinic ${index + 1}...`);
        console.log(`URL: ${url}`);
        
        const result = await googlePlacesService.fetchClinicReviews(url);
        
        if (result.success) {
            const data = result.data;
            console.log(`✅ Successfully fetched data for: ${data.name}`);
            console.log(`📍 Address: ${data.address}`);
            console.log(`⭐ Rating: ${data.rating}/5`);
            console.log(`👥 Reviews: ${data.userRatingsTotal}`);
            console.log(`📞 Phone: ${data.phone || 'N/A'}`);
            console.log(`🌐 Website: ${data.website || 'N/A'}`);
            
            return {
                name: data.name,
                address: data.address,
                phone: data.phone,
                website: data.website,
                googleMapsLink: url,
                googleRating: data.rating,
                googleReviewCount: data.userRatingsTotal,
                googlePlaceId: data.placeId,
                googleReviews: data.reviews,
                googleReviewStats: data.reviewStats,
                lastReviewFetch: new Date(),
                // Generate realistic pricing based on location and rating
                pricePerImplant: generateRealisticPrice(data.rating, 'implant'),
                pricePerCrown: generateRealisticPrice(data.rating, 'crown'),
                pricePerRootCanal: generateRealisticPrice(data.rating, 'rootcanal'),
                pricePerFilling: generateRealisticPrice(data.rating, 'filling')
            };
        } else {
            console.log(`❌ Failed to fetch data: ${result.error}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching clinic data:`, error);
        return null;
    }
}

// Function to generate realistic pricing based on rating and location
function generateRealisticPrice(rating, treatmentType) {
    const basePrices = {
        implant: 1500, // Base price in dollars
        crown: 800,
        rootcanal: 600,
        filling: 150
    };
    
    // Adjust price based on rating (higher rating = higher price)
    const ratingMultiplier = 0.8 + (rating * 0.1); // 0.9 to 1.3 range
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;
    
    const finalPrice = Math.round(basePrices[treatmentType] * ratingMultiplier * randomFactor);
    return finalPrice * 100; // Convert to cents
}

// Function to create clinic with real data
async function createClinicWithRealData(clinicData, index) {
    try {
        console.log(`\n🏥 Creating clinic ${index + 1}: ${clinicData.name}`);
        
        // Generate unique slug
        const baseSlug = generateSlug(clinicData.name, 'clinic', 'global');
        let slug = baseSlug;
        let counter = 1;
        
        while (await prisma.clinic.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        // Create clinic with real data
        const clinic = await prisma.clinic.create({
            data: {
                name: clinicData.name,
                slug: slug,
                email: `contact@${slug.replace(/-/g, '')}.com`, // Generate email from slug
                phone: clinicData.phone,
                website: clinicData.website,
                address: clinicData.address,
                city: extractCityFromAddress(clinicData.address),
                country: extractCountryFromAddress(clinicData.address),
                status: 'ACTIVE',
                clinicType: 'DENTAL',
                // Pricing information
                pricePerImplant: clinicData.pricePerImplant,
                pricePerCrown: clinicData.pricePerCrown,
                pricePerRootCanal: clinicData.pricePerRootCanal,
                pricePerFilling: clinicData.pricePerFilling,
                // Google Places data
                googleMapsLink: clinicData.googleMapsLink,
                googleRating: clinicData.googleRating,
                googleReviewCount: clinicData.googleReviewCount,
                googlePlaceId: clinicData.googlePlaceId,
                googleReviews: clinicData.googleReviews,
                googleReviewStats: clinicData.googleReviewStats,
                lastReviewFetch: clinicData.lastReviewFetch,
                // Additional fields
                description: `Professional dental clinic with ${clinicData.googleRating}/5 star rating and ${clinicData.googleReviewCount} reviews. Located at ${clinicData.address}.`,
                services: ['General Dentistry', 'Implants', 'Crowns', 'Root Canal', 'Fillings'],
                specialties: ['Cosmetic Dentistry', 'Restorative Dentistry'],
                languages: ['English', 'Local Language'],
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
        console.log(`\n📝 Recent Reviews for ${clinic.name}:`);
        clinic.googleReviews.slice(0, 3).forEach((review, index) => {
            console.log(`   ${index + 1}. ${review.authorName} (${review.rating}/5): "${review.text.substring(0, 100)}..."`);
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
async function seedClinicsWithRealData() {
    try {
        console.log('🌱 Starting clinic seeding with real Google Maps data...');
        console.log('================================================');
        
        // Check if Google Places API key is configured
        if (!process.env.GOOGLE_PLACES_API_KEY) {
            console.log('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
            console.log('💡 Please set your Google Places API key to fetch real clinic data');
            return;
        }
        
        const createdClinics = [];
        
        // Fetch data for each clinic URL
        for (let i = 0; i < clinicUrls.length; i++) {
            const url = clinicUrls[i];
            console.log(`\n🔍 Processing clinic ${i + 1}/${clinicUrls.length}`);
            
            const clinicData = await fetchClinicData(url, i);
            
            if (clinicData) {
                const clinic = await createClinicWithRealData(clinicData, i);
                if (clinic) {
                    createdClinics.push(clinic);
                    displayReviewSummary(clinic);
                }
            }
            
            // Add delay between requests to avoid rate limiting
            if (i < clinicUrls.length - 1) {
                console.log('⏳ Waiting 2 seconds before next request...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('\n🎉 Clinic seeding completed!');
        console.log('============================');
        console.log(`✅ Created ${createdClinics.length} clinics with real Google Maps data`);
        
        // Display summary
        createdClinics.forEach((clinic, index) => {
            console.log(`\n${index + 1}. ${clinic.name}`);
            console.log(`   📍 ${clinic.address}`);
            console.log(`   ⭐ ${clinic.googleRating}/5 (${clinic.googleReviewCount} reviews)`);
            console.log(`   💰 Implant: $${clinic.pricePerImplant/100}, Crown: $${clinic.pricePerCrown/100}`);
            console.log(`   🔗 ${clinic.googleMapsLink}`);
        });
        
        console.log('\n✨ All clinics now have real Google Maps reviews and ratings!');
        
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
if (require.main === module) {
    seedClinicsWithRealData();
}

module.exports = { seedClinicsWithRealData };
