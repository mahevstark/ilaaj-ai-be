const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Treatment data based on Happy Smile Clinics price list
const treatments = [
    // Crowns and Veneers
    { name: 'Zirconia Porcelain Crown', category: 'Dentistry', subcategory: 'Crowns', description: 'High-quality zirconia porcelain crown for durable restoration' },
    { name: 'E-Max Porcelain Crown', category: 'Dentistry', subcategory: 'Crowns', description: 'Premium E-Max porcelain crown with excellent aesthetics' },
    { name: 'E-Max Porcelain Veneer', category: 'Dentistry', subcategory: 'Veneers', description: 'E-Max porcelain veneer for perfect smile makeover' },
    { name: 'E-max Endo Crown', category: 'Dentistry', subcategory: 'Crowns', description: 'E-Max endodontic crown for root canal treated teeth' },
    { name: 'E-Max (Inley - Onley - Overlay)', category: 'Dentistry', subcategory: 'Inlays', description: 'E-Max inlay, onlay, or overlay restoration' },
    
    // Implants
    { name: 'Osstem Implant', category: 'Dentistry', subcategory: 'Implants', description: 'Reliable Osstem dental implant system' },
    { name: 'Hiossen Implant', category: 'Dentistry', subcategory: 'Implants', description: 'Advanced Hiossen implant technology' },
    { name: 'Nobel Implant', category: 'Dentistry', subcategory: 'Implants', description: 'Premium Nobel Biocare implant system' },
    { name: 'Straumann Implant', category: 'Dentistry', subcategory: 'Implants', description: 'Swiss precision Straumann implant system' },
    
    // Bone Augmentation
    { name: 'Sinus Lifting (Internal)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Internal sinus lift procedure' },
    { name: 'Sinus Lifting (External)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'External sinus lift procedure' },
    { name: 'Bone Augmentation (Stage 1)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Stage 1 bone augmentation procedure' },
    { name: 'Bone Augmentation (Stage 2)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Stage 2 bone augmentation procedure' },
    { name: 'Bone Augmentation (Stage 3)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Stage 3 bone augmentation procedure' },
    { name: 'Bone Augmentation (Stage 4/ Block Greft)', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Stage 4 bone augmentation with block graft' },
    { name: 'Bone Graft', category: 'Dentistry', subcategory: 'Bone Augmentation', description: 'Bone grafting procedure' },
    { name: 'Membran 25x25', category: 'Dentistry', subcategory: 'Bone Augmentation', description: '25x25mm membrane for guided bone regeneration' },
    
    // Surgical Procedures
    { name: 'Flap Operation (For One Jaw)', category: 'Dentistry', subcategory: 'Surgery', description: 'Flap operation for single jaw' },
    { name: 'Flap Operation (Full Mouth)', category: 'Dentistry', subcategory: 'Surgery', description: 'Full mouth flap operation' },
    { name: 'Cyst Operation', category: 'Dentistry', subcategory: 'Surgery', description: 'Dental cyst removal surgery' },
    { name: 'Frenectomy', category: 'Dentistry', subcategory: 'Surgery', description: 'Frenectomy procedure' },
    { name: 'Free Gingival Graft', category: 'Dentistry', subcategory: 'Surgery', description: 'Free gingival graft procedure' },
    { name: 'Connective Tissue Graft', category: 'Dentistry', subcategory: 'Surgery', description: 'Connective tissue graft procedure' },
    
    // Tooth Extraction
    { name: 'Surgical Tooth Extraction (Stage 1)', category: 'Dentistry', subcategory: 'Extraction', description: 'Stage 1 surgical tooth extraction' },
    { name: 'Surgical Tooth Extraction (Stage 2)', category: 'Dentistry', subcategory: 'Extraction', description: 'Stage 2 surgical tooth extraction' },
    { name: 'Complex Tooth Extraction', category: 'Dentistry', subcategory: 'Extraction', description: 'Complex tooth extraction procedure' },
    { name: 'Tooth Extraction', category: 'Dentistry', subcategory: 'Extraction', description: 'Simple tooth extraction' },
    
    // Endodontics
    { name: 'Root Canal Treatment', category: 'Dentistry', subcategory: 'Endodontics', description: 'Root canal treatment procedure' },
    { name: 'Root Canal Retreatment', category: 'Dentistry', subcategory: 'Endodontics', description: 'Root canal retreatment procedure' },
    
    // Restorative Dentistry
    { name: 'White Filling', category: 'Dentistry', subcategory: 'Restorative', description: 'White composite filling' },
    { name: 'Aesthetic Filling', category: 'Dentistry', subcategory: 'Restorative', description: 'Aesthetic composite filling' },
    { name: 'Fiber Post', category: 'Dentistry', subcategory: 'Restorative', description: 'Fiber post for tooth restoration' },
    { name: 'Kuafaj', category: 'Dentistry', subcategory: 'Restorative', description: 'Kuafaj restoration procedure' },
    { name: 'Fiber Splint', category: 'Dentistry', subcategory: 'Restorative', description: 'Fiber splint for tooth stabilization' },
    
    // Preventive and Cosmetic
    { name: 'Gum Curretage (Per Tooth)', category: 'Dentistry', subcategory: 'Periodontics', description: 'Gum curettage per tooth' },
    { name: 'Gum Curretage (For One Jaw)', category: 'Dentistry', subcategory: 'Periodontics', description: 'Gum curettage for one jaw' },
    { name: 'Gum Curretage (Full Mouth)', category: 'Dentistry', subcategory: 'Periodontics', description: 'Full mouth gum curettage' },
    { name: 'Gum Contouring (Per Tooth)', category: 'Dentistry', subcategory: 'Cosmetic', description: 'Gum contouring per tooth' },
    { name: 'Full-mouth Teeth Cleaning', category: 'Dentistry', subcategory: 'Preventive', description: 'Complete teeth cleaning procedure' },
    { name: 'Teeth Whitening', category: 'Dentistry', subcategory: 'Cosmetic', description: 'Professional teeth whitening treatment' },
    { name: 'Occlusal Splint', category: 'Dentistry', subcategory: 'Restorative', description: 'Occlusal splint for bruxism treatment' }
];

// Pricing tiers for different clinics (based on agency prices from the image)
const pricingTiers = {
    budget: 0.7,      // 30% discount from base price
    standard: 0.85,   // 15% discount from base price
    premium: 1.0,     // Base price
    luxury: 1.2,      // 20% premium
    exclusive: 1.4    // 40% premium
};

// Base prices in cents (from the image - agency prices)
const basePrices = {
    'Zirconia Porcelain Crown': 12000,
    'E-Max Porcelain Crown': 16000,
    'E-Max Porcelain Veneer': 16000,
    'E-max Endo Crown': 16000,
    'E-Max (Inley - Onley - Overlay)': 16000,
    'Osstem Implant': 25000,
    'Hiossen Implant': 25000,
    'Nobel Implant': 58000,
    'Straumann Implant': 68000,
    'Sinus Lifting (Internal)': 10000,
    'Sinus Lifting (External)': 39000,
    'Bone Augmentation (Stage 1)': 80000,
    'Bone Augmentation (Stage 2)': 85000,
    'Bone Augmentation (Stage 3)': 100000,
    'Bone Augmentation (Stage 4/ Block Greft)': 240000,
    'Bone Graft': 10000,
    'Membran 25x25': 19000,
    'Flap Operation (For One Jaw)': 23000,
    'Flap Operation (Full Mouth)': 46000,
    'Gum Curretage (Per Tooth)': 1000,
    'Gum Curretage (For One Jaw)': 9000,
    'Gum Curretage (Full Mouth)': 18000,
    'Gum Contouring (Per Tooth)': 2000,
    'Cyst Operation': 17000,
    'Frenectomy': 14000,
    'Free Gingival Graft': 25000,
    'Connective Tissue Graft': 25000,
    'Surgical Tooth Extraction (Stage 1)': 7500,
    'Surgical Tooth Extraction (Stage 2)': 10000,
    'Complex Tooth Extraction': 4000,
    'Tooth Extraction': 2000,
    'Root Canal Treatment': 9000,
    'Root Canal Retreatment': 15000,
    'White Filling': 4000,
    'Aesthetic Filling': 6000,
    'Fiber Post': 6000,
    'Kuafaj': 1000,
    'Fiber Splint': 10000,
    'Full-mouth Teeth Cleaning': 3000,
    'Teeth Whitening': 11000,
    'Occlusal Splint': 14000
};

// Clinic data
const clinics = [
    {
        name: 'Happy Smile Clinics',
        slug: 'happy-smile-clinics',
        description: 'Premium dental clinic offering comprehensive dental treatments with state-of-the-art technology.',
        email: 'hello@hsctr.com',
        phone: '+90 (850) 305 95 95',
        website: 'www.happysmileclinics.com',
        address: 'Atatürk Mahallesi, Cumhuriyet Caddesi No:45',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        latitude: 41.0082,
        longitude: 28.9784,
        clinicType: 'DENTAL',
        status: 'ACTIVE',
        services: ['General Dentistry', 'Cosmetic Dentistry', 'Oral Surgery', 'Orthodontics', 'Periodontics'],
        specialties: ['Dental Implants', 'Crowns and Bridges', 'Teeth Whitening', 'Root Canal Treatment'],
        languages: ['Turkish', 'English', 'German', 'Arabic'],
        pricingTier: 'premium',
        isVerified: true,
        rating: 4.8,
        reviewCount: 156,
        photos: [
            'https://picsum.photos/800/600?random=1',
            'https://picsum.photos/800/600?random=2',
            'https://picsum.photos/800/600?random=3'
        ]
    },
    {
        name: 'Dental Excellence Center',
        slug: 'dental-excellence-center',
        description: 'Modern dental practice specializing in cosmetic and restorative dentistry.',
        email: 'info@dentalexcellence.com',
        phone: '+90 (212) 555 0123',
        website: 'www.dentalexcellence.com',
        address: 'Levent Mahallesi, Büyükdere Caddesi No:123',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34330',
        latitude: 41.0766,
        longitude: 29.0084,
        clinicType: 'DENTAL',
        status: 'ACTIVE',
        services: ['General Dentistry', 'Cosmetic Dentistry', 'Oral Surgery'],
        specialties: ['Dental Implants', 'Veneers', 'Teeth Whitening'],
        languages: ['Turkish', 'English', 'French'],
        pricingTier: 'luxury',
        isVerified: true,
        rating: 4.9,
        reviewCount: 89,
        photos: [
            'https://picsum.photos/800/600?random=4',
            'https://picsum.photos/800/600?random=5',
            'https://picsum.photos/800/600?random=6',
            'https://picsum.photos/800/600?random=7'
        ]
    },
    {
        name: 'Smile Care Clinic',
        slug: 'smile-care-clinic',
        description: 'Affordable dental care with quality treatments for all family members.',
        email: 'contact@smilecare.com',
        phone: '+90 (216) 444 5678',
        website: 'www.smilecare.com',
        address: 'Kadıköy Mahallesi, Moda Caddesi No:67',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34710',
        latitude: 40.9923,
        longitude: 29.0234,
        clinicType: 'DENTAL',
        status: 'ACTIVE',
        services: ['General Dentistry', 'Pediatric Dentistry', 'Emergency Care'],
        specialties: ['Preventive Care', 'Fillings', 'Extractions'],
        languages: ['Turkish', 'English'],
        pricingTier: 'budget',
        isVerified: true,
        rating: 4.5,
        reviewCount: 203,
        photos: [
            'https://picsum.photos/800/600?random=8',
            'https://picsum.photos/800/600?random=9'
        ]
    },
    {
        name: 'Istanbul Dental Center',
        slug: 'istanbul-dental-center',
        description: 'Comprehensive dental services with international standards and multilingual staff.',
        email: 'hello@istanbuldental.com',
        phone: '+90 (212) 333 7890',
        website: 'www.istanbuldental.com',
        address: 'Beşiktaş Mahallesi, Barbaros Bulvarı No:89',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34353',
        latitude: 41.0428,
        longitude: 29.0084,
        clinicType: 'DENTAL',
        status: 'ACTIVE',
        services: ['General Dentistry', 'Oral Surgery', 'Orthodontics', 'Periodontics', 'Endodontics'],
        specialties: ['Dental Implants', 'Bone Augmentation', 'Complex Surgeries'],
        languages: ['Turkish', 'English', 'German', 'Russian', 'Arabic'],
        pricingTier: 'standard',
        isVerified: true,
        rating: 4.7,
        reviewCount: 134,
        photos: [
            'https://picsum.photos/800/600?random=10',
            'https://picsum.photos/800/600?random=11',
            'https://picsum.photos/800/600?random=12',
            'https://picsum.photos/800/600?random=13',
            'https://picsum.photos/800/600?random=14'
        ]
    },
    {
        name: 'Elite Dental Studio',
        slug: 'elite-dental-studio',
        description: 'Exclusive dental practice offering luxury treatments and personalized care.',
        email: 'info@elitedental.com',
        phone: '+90 (212) 777 9999',
        website: 'www.elitedental.com',
        address: 'Nişantaşı Mahallesi, Teşvikiye Caddesi No:156',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34365',
        latitude: 41.0478,
        longitude: 28.9878,
        clinicType: 'DENTAL',
        status: 'ACTIVE',
        services: ['Cosmetic Dentistry', 'Luxury Treatments', 'VIP Care'],
        specialties: ['Smile Makeovers', 'Luxury Implants', 'Aesthetic Procedures'],
        languages: ['Turkish', 'English', 'French', 'Italian', 'Spanish'],
        pricingTier: 'exclusive',
        isVerified: true,
        rating: 4.9,
        reviewCount: 67,
        photos: [
            'https://picsum.photos/800/600?random=15',
            'https://picsum.photos/800/600?random=16',
            'https://picsum.photos/800/600?random=17',
            'https://picsum.photos/800/600?random=18'
        ]
    }
];

async function main() {
    console.log('🌱 Starting clinic and treatment seeding...');

    try {
        // Create clinics
        const createdClinics = [];
        for (const clinicData of clinics) {
            const clinic = await prisma.clinic.create({
                data: {
                    ...clinicData,
                    operatingHours: {
                        monday: { open: '09:00', close: '18:00' },
                        tuesday: { open: '09:00', close: '18:00' },
                        wednesday: { open: '09:00', close: '18:00' },
                        thursday: { open: '09:00', close: '18:00' },
                        friday: { open: '09:00', close: '18:00' },
                        saturday: { open: '09:00', close: '16:00' },
                        sunday: { open: '10:00', close: '14:00' }
                    },
                    socialMedia: {
                        instagram: `@${clinicData.slug}`,
                        facebook: clinicData.slug,
                        twitter: clinicData.slug
                    },
                    onlinePresence: {
                        googleMyBusiness: true,
                        yelp: true,
                        healthgrades: true
                    },
                    thirdPartySource: 'manual',
                    thirdPartyData: {
                        source: 'manual_entry',
                        verified: true
                    },
                    lastSyncedAt: new Date(),
                    verificationDate: new Date(),
                    acceptsInsurance: true,
                    insuranceProviders: ['Aetna', 'Cigna', 'Blue Cross', 'UnitedHealth'],
                    maxPatients: 50,
                    currentPatients: Math.floor(Math.random() * 30),
                    totalAppointments: Math.floor(Math.random() * 500) + 100
                }
            });
            createdClinics.push(clinic);
            console.log(`✅ Created clinic: ${clinic.name}`);
        }

        // Create treatments for each clinic
        for (const clinic of createdClinics) {
            const pricingTier = pricingTiers[clinic.pricingTier];
            
            for (const treatmentData of treatments) {
                const basePrice = basePrices[treatmentData.name] || 10000; // Default price if not found
                const finalPrice = Math.round(basePrice * pricingTier);
                
                const treatment = await prisma.treatment.create({
                    data: {
                        name: treatmentData.name,
                        description: treatmentData.description,
                        category: treatmentData.category,
                        subcategory: treatmentData.subcategory,
                        basePrice: finalPrice,
                        priceRange: {
                            min: Math.round(finalPrice * 0.9),
                            max: Math.round(finalPrice * 1.1)
                        },
                        currency: 'EUR',
                        isPriceNegotiable: true,
                        duration: getTreatmentDuration(treatmentData.name),
                        preparationTime: 15,
                        recoveryTime: getRecoveryTime(treatmentData.name),
                        requirements: getTreatmentRequirements(treatmentData.name),
                        contraindications: getContraindications(treatmentData.name),
                        sideEffects: getSideEffects(treatmentData.name),
                        successRate: getSuccessRate(treatmentData.name),
                        status: 'ACTIVE',
                        isAvailable: true,
                        maxDailyBookings: getMaxDailyBookings(treatmentData.name),
                        clinicId: clinic.id,
                        equipment: getEquipment(treatmentData.name),
                        certifications: getCertifications(treatmentData.name),
                        insuranceCoverage: ['Dental Insurance', 'Health Insurance'],
                        ageRestrictions: { min: 18, max: 80 },
                        createdBy: 1, // Assuming admin user ID 1
                        updatedBy: 1
                    }
                });
            }
            console.log(`✅ Created ${treatments.length} treatments for ${clinic.name}`);
        }

        console.log('🎉 Clinic and treatment seeding completed successfully!');
        console.log(`📊 Created ${createdClinics.length} clinics with ${treatments.length} treatments each`);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Helper functions
function getTreatmentDuration(treatmentName) {
    const durations = {
        'Tooth Extraction': 30,
        'White Filling': 45,
        'Aesthetic Filling': 60,
        'Root Canal Treatment': 90,
        'Root Canal Retreatment': 120,
        'Teeth Whitening': 60,
        'Full-mouth Teeth Cleaning': 60,
        'Zirconia Porcelain Crown': 120,
        'E-Max Porcelain Crown': 120,
        'E-Max Porcelain Veneer': 150,
        'Osstem Implant': 60,
        'Hiossen Implant': 60,
        'Nobel Implant': 90,
        'Straumann Implant': 90,
        'Sinus Lifting (Internal)': 90,
        'Sinus Lifting (External)': 180,
        'Bone Augmentation (Stage 1)': 120,
        'Bone Augmentation (Stage 2)': 150,
        'Bone Augmentation (Stage 3)': 180,
        'Bone Augmentation (Stage 4/ Block Greft)': 240,
        'Flap Operation (For One Jaw)': 90,
        'Flap Operation (Full Mouth)': 180,
        'Cyst Operation': 60,
        'Frenectomy': 45,
        'Free Gingival Graft': 120,
        'Connective Tissue Graft': 120
    };
    return durations[treatmentName] || 60;
}

function getRecoveryTime(treatmentName) {
    const recoveryTimes = {
        'Tooth Extraction': 7,
        'Root Canal Treatment': 3,
        'Root Canal Retreatment': 5,
        'Sinus Lifting (Internal)': 14,
        'Sinus Lifting (External)': 21,
        'Bone Augmentation (Stage 1)': 14,
        'Bone Augmentation (Stage 2)': 21,
        'Bone Augmentation (Stage 3)': 28,
        'Bone Augmentation (Stage 4/ Block Greft)': 42,
        'Flap Operation (For One Jaw)': 7,
        'Flap Operation (Full Mouth)': 14,
        'Cyst Operation': 7,
        'Frenectomy': 5,
        'Free Gingival Graft': 14,
        'Connective Tissue Graft': 14
    };
    return recoveryTimes[treatmentName] || 1;
}

function getTreatmentRequirements(treatmentName) {
    const requirements = {
        'Sinus Lifting (Internal)': ['CT Scan', 'Medical History'],
        'Sinus Lifting (External)': ['CT Scan', 'Medical History', 'Blood Test'],
        'Bone Augmentation (Stage 1)': ['CT Scan', 'Medical History'],
        'Bone Augmentation (Stage 2)': ['CT Scan', 'Medical History', 'Blood Test'],
        'Bone Augmentation (Stage 3)': ['CT Scan', 'Medical History', 'Blood Test', 'Consultation'],
        'Bone Augmentation (Stage 4/ Block Greft)': ['CT Scan', 'Medical History', 'Blood Test', 'Consultation', '3D Planning'],
        'Teeth Whitening': ['Dental Cleaning', 'Consultation'],
        'Root Canal Treatment': ['X-ray', 'Consultation'],
        'Root Canal Retreatment': ['X-ray', 'Consultation', 'Previous Treatment History']
    };
    return requirements[treatmentName] || ['Consultation'];
}

function getContraindications(treatmentName) {
    const contraindications = {
        'Sinus Lifting (Internal)': ['Sinus Infection', 'Severe Allergies'],
        'Sinus Lifting (External)': ['Sinus Infection', 'Severe Allergies', 'Heart Condition'],
        'Bone Augmentation (Stage 1)': ['Diabetes', 'Smoking'],
        'Bone Augmentation (Stage 2)': ['Diabetes', 'Smoking', 'Osteoporosis'],
        'Bone Augmentation (Stage 3)': ['Diabetes', 'Smoking', 'Osteoporosis', 'Autoimmune Disease'],
        'Bone Augmentation (Stage 4/ Block Greft)': ['Diabetes', 'Smoking', 'Osteoporosis', 'Autoimmune Disease', 'Blood Disorders'],
        'Teeth Whitening': ['Pregnancy', 'Sensitive Teeth'],
        'Root Canal Treatment': ['Severe Infection', 'Cracked Tooth'],
        'Tooth Extraction': ['Bleeding Disorders', 'Heart Condition']
    };
    return contraindications[treatmentName] || ['Pregnancy', 'Allergies'];
}

function getSideEffects(treatmentName) {
    const sideEffects = {
        'Tooth Extraction': ['Swelling', 'Bleeding', 'Pain'],
        'Root Canal Treatment': ['Temporary Pain', 'Sensitivity'],
        'Teeth Whitening': ['Sensitivity', 'Gum Irritation'],
        'Sinus Lifting (Internal)': ['Swelling', 'Bruising', 'Sinus Pressure'],
        'Sinus Lifting (External)': ['Swelling', 'Bruising', 'Sinus Pressure', 'Numbness'],
        'Bone Augmentation (Stage 1)': ['Swelling', 'Bruising', 'Pain'],
        'Bone Augmentation (Stage 2)': ['Swelling', 'Bruising', 'Pain', 'Numbness'],
        'Bone Augmentation (Stage 3)': ['Swelling', 'Bruising', 'Pain', 'Numbness', 'Stiffness'],
        'Bone Augmentation (Stage 4/ Block Greft)': ['Swelling', 'Bruising', 'Pain', 'Numbness', 'Stiffness', 'Limited Mouth Opening']
    };
    return sideEffects[treatmentName] || ['Temporary Discomfort'];
}

function getSuccessRate(treatmentName) {
    const successRates = {
        'Tooth Extraction': 98.5,
        'Root Canal Treatment': 95.0,
        'Root Canal Retreatment': 85.0,
        'Teeth Whitening': 99.0,
        'Zirconia Porcelain Crown': 97.0,
        'E-Max Porcelain Crown': 98.0,
        'E-Max Porcelain Veneer': 96.0,
        'Osstem Implant': 95.0,
        'Hiossen Implant': 95.0,
        'Nobel Implant': 98.0,
        'Straumann Implant': 98.5,
        'Sinus Lifting (Internal)': 92.0,
        'Sinus Lifting (External)': 90.0,
        'Bone Augmentation (Stage 1)': 88.0,
        'Bone Augmentation (Stage 2)': 85.0,
        'Bone Augmentation (Stage 3)': 82.0,
        'Bone Augmentation (Stage 4/ Block Greft)': 80.0
    };
    return successRates[treatmentName] || 90.0;
}

function getMaxDailyBookings(treatmentName) {
    const maxBookings = {
        'Tooth Extraction': 8,
        'White Filling': 12,
        'Aesthetic Filling': 10,
        'Root Canal Treatment': 6,
        'Root Canal Retreatment': 4,
        'Teeth Whitening': 6,
        'Full-mouth Teeth Cleaning': 8,
        'Zirconia Porcelain Crown': 4,
        'E-Max Porcelain Crown': 4,
        'E-Max Porcelain Veneer': 3,
        'Osstem Implant': 3,
        'Hiossen Implant': 3,
        'Nobel Implant': 2,
        'Straumann Implant': 2,
        'Sinus Lifting (Internal)': 2,
        'Sinus Lifting (External)': 1,
        'Bone Augmentation (Stage 1)': 2,
        'Bone Augmentation (Stage 2)': 1,
        'Bone Augmentation (Stage 3)': 1,
        'Bone Augmentation (Stage 4/ Block Greft)': 1
    };
    return maxBookings[treatmentName] || 5;
}

function getEquipment(treatmentName) {
    const equipment = {
        'Root Canal Treatment': ['Endodontic Motor', 'Apex Locator', 'Rotary Files'],
        'Root Canal Retreatment': ['Endodontic Motor', 'Apex Locator', 'Rotary Files', 'Ultrasonic Tips'],
        'Teeth Whitening': ['LED Whitening System', 'Custom Trays'],
        'Sinus Lifting (Internal)': ['Piezosurgery Unit', 'Sinus Lift Kit'],
        'Sinus Lifting (External)': ['Piezosurgery Unit', 'Sinus Lift Kit', '3D Imaging'],
        'Bone Augmentation (Stage 1)': ['Bone Grafting Kit', 'Membrane'],
        'Bone Augmentation (Stage 2)': ['Bone Grafting Kit', 'Membrane', 'Piezosurgery Unit'],
        'Bone Augmentation (Stage 3)': ['Bone Grafting Kit', 'Membrane', 'Piezosurgery Unit', '3D Planning Software'],
        'Bone Augmentation (Stage 4/ Block Greft)': ['Bone Grafting Kit', 'Membrane', 'Piezosurgery Unit', '3D Planning Software', 'Microsurgery Tools'],
        'Osstem Implant': ['Implant Kit', 'Surgical Guide'],
        'Hiossen Implant': ['Implant Kit', 'Surgical Guide'],
        'Nobel Implant': ['Implant Kit', 'Surgical Guide', '3D Planning'],
        'Straumann Implant': ['Implant Kit', 'Surgical Guide', '3D Planning', 'Piezosurgery Unit']
    };
    return equipment[treatmentName] || ['Standard Dental Equipment'];
}

function getCertifications(treatmentName) {
    const certifications = {
        'Root Canal Treatment': ['Endodontic Certification', 'Dental License'],
        'Root Canal Retreatment': ['Endodontic Certification', 'Advanced Endodontics', 'Dental License'],
        'Sinus Lifting (Internal)': ['Oral Surgery Certification', 'Sinus Lift Training'],
        'Sinus Lifting (External)': ['Oral Surgery Certification', 'Advanced Sinus Surgery', '3D Planning Certification'],
        'Bone Augmentation (Stage 1)': ['Periodontics Certification', 'Bone Grafting Training'],
        'Bone Augmentation (Stage 2)': ['Periodontics Certification', 'Advanced Bone Grafting', 'Piezosurgery Training'],
        'Bone Augmentation (Stage 3)': ['Periodontics Certification', 'Advanced Bone Grafting', 'Piezosurgery Training', '3D Planning Certification'],
        'Bone Augmentation (Stage 4/ Block Greft)': ['Periodontics Certification', 'Advanced Bone Grafting', 'Piezosurgery Training', '3D Planning Certification', 'Microsurgery Training'],
        'Osstem Implant': ['Implant Certification', 'Osstem Training'],
        'Hiossen Implant': ['Implant Certification', 'Hiossen Training'],
        'Nobel Implant': ['Implant Certification', 'Nobel Biocare Training', '3D Planning Certification'],
        'Straumann Implant': ['Implant Certification', 'Straumann Training', '3D Planning Certification', 'Piezosurgery Training']
    };
    return certifications[treatmentName] || ['Dental License', 'General Practice'];
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

