const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function verifyData() {
    try {
        console.log('🔍 Verifying clinic and treatment data...\n');

        // Get all clinics
        const clinics = await prisma.clinic.findMany({
            include: {
                treatments: {
                    select: {
                        name: true,
                        basePrice: true,
                        currency: true,
                        category: true,
                        subcategory: true
                    }
                }
            }
        });

        console.log(`📊 Found ${clinics.length} clinics in database\n`);

        for (const clinic of clinics) {
            console.log(`🏥 ${clinic.name}`);
            console.log(`   📍 ${clinic.city}, ${clinic.country}`);
            console.log(`   💰 Pricing Tier: ${clinic.pricingTier}`);
            console.log(`   ⭐ Rating: ${clinic.rating}/5.0 (${clinic.reviewCount} reviews)`);
            console.log(`   🦷 Treatments: ${clinic.treatments.length}`);
            
            // Show sample treatments with prices
            const sampleTreatments = clinic.treatments.slice(0, 5);
            console.log('   📋 Sample Treatments:');
            for (const treatment of sampleTreatments) {
                const priceInEuros = (treatment.basePrice / 100).toFixed(2);
                console.log(`      • ${treatment.name}: €${priceInEuros}`);
            }
            console.log('');
        }

        // Get treatment statistics
        const treatmentStats = await prisma.treatment.groupBy({
            by: ['category'],
            _count: {
                id: true
            }
        });

        console.log('📈 Treatment Categories:');
        for (const stat of treatmentStats) {
            console.log(`   • ${stat.category}: ${stat._count.id} treatments`);
        }

        console.log('\n✅ Data verification completed successfully!');

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();

