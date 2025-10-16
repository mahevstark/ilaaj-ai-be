const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5432/bandage?schema=public"
    }
  }
});

async function setupDatabase() {
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Create database if it doesn't exist
    await prisma.$executeRaw`CREATE DATABASE IF NOT EXISTS bandage;`;
    console.log('✅ Database created/verified');
    
    // Run migrations
    const { execSync } = require('child_process');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Database schema updated');
    
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n🔧 To fix this:');
      console.log('1. Install PostgreSQL locally: brew install postgresql');
      console.log('2. Start PostgreSQL: brew services start postgresql');
      console.log('3. Create database: createdb bandage');
      console.log('4. Run this script again: node setup-local-db.js');
    }
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
