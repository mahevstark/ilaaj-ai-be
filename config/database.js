const prisma = require('../lib/prisma');

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('📊 PostgreSQL Connected via Prisma');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    // Don't exit the process, just log the error
    console.log('⚠️  Running without database connection. Some features may not work.');
    console.log('💡 To fix: Run "node setup-local-db.js" to set up local database');
    
    // Return false instead of exiting
    return false;
  }
};

module.exports = connectDB;
