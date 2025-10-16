const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users (optional)
  const sampleUsers = [
    {
      phoneNumber: '+1234567890',
      isVerified: true,
      firstName: 'John',
      lastName: 'Doe',
      gender: 'MALE',
      email: 'john@example.com'
    },
    {
      phoneNumber: '+0987654321',
      isVerified: true,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'FEMALE',
      email: 'jane@example.com'
    }
  ];

  for (const userData of sampleUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: userData.phoneNumber }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData
      });
      console.log(`✅ Created user: ${userData.phoneNumber}`);
    } else {
      console.log(`⚠️  User already exists: ${userData.phoneNumber}`);
    }
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
