const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get health stats for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Handle phone number as userId - find the actual user ID
    let actualUserId = userId;
    if (userId.startsWith('92') || userId.startsWith('+92')) {
      // This is a phone number, find the user ID
      const user = await prisma.user.findUnique({
        where: { phoneNumber: userId }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      actualUserId = user.id;
    }

    // Get user's health stats
    const healthStats = await prisma.healthStats.findUnique({
      where: { userId: actualUserId },
    });

    if (!healthStats) {
      // Return default stats (0%) for new users
      return res.json({
        success: true,
        data: {
          bloodPressure: 0,
          stomach: 0,
          skin: 0,
          liver: 0,
          head: 0,
          lastUpdated: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        bloodPressure: healthStats.bloodPressure,
        stomach: healthStats.stomach,
        skin: healthStats.skin,
        liver: healthStats.liver,
        head: healthStats.head,
        lastUpdated: healthStats.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching health stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health stats'
    });
  }
});

// Update health stats (called by n8n webhook)
router.post('/update', async (req, res) => {
  try {
    const { userId, organ, healthPercentage } = req.body;

    if (!userId || !organ || healthPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, organ, healthPercentage'
      });
    }

    // Handle phone number as userId - find the actual user ID
    let actualUserId = userId;
    if (userId.startsWith('92') || userId.startsWith('+92')) {
      // This is a phone number, find the user ID
      const user = await prisma.user.findUnique({
        where: { phoneNumber: userId }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      actualUserId = user.id;
    }

    // Validate organ type
    const validOrgans = ['bloodPressure', 'stomach', 'skin', 'liver', 'head'];
    if (!validOrgans.includes(organ)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organ type'
      });
    }

    // Validate health percentage (0-100)
    if (healthPercentage < 0 || healthPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Health percentage must be between 0 and 100'
      });
    }

    // Upsert health stats
    const updateData = {
      [organ]: healthPercentage,
      updatedAt: new Date()
    };

    const healthStats = await prisma.healthStats.upsert({
      where: { userId: actualUserId },
      update: updateData,
      create: {
        userId: actualUserId,
        bloodPressure: organ === 'bloodPressure' ? healthPercentage : 0,
        stomach: organ === 'stomach' ? healthPercentage : 0,
        skin: organ === 'skin' ? healthPercentage : 0,
        liver: organ === 'liver' ? healthPercentage : 0,
        head: organ === 'head' ? healthPercentage : 0,
        ...updateData
      }
    });

    console.log(`📊 Health stats updated for user ${userId}: ${organ} = ${healthPercentage}%`);

    res.json({
      success: true,
      message: 'Health stats updated successfully',
      data: healthStats
    });
  } catch (error) {
    console.error('Error updating health stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update health stats'
    });
  }
});

// Get health stats summary for dashboard
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Fetching health stats for user: ${userId}`);

    // Check if Prisma client is connected
    if (!prisma) {
      console.error('❌ Prisma client not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Handle phone number as userId - find the actual user ID
    let actualUserId = userId;
    if (userId.startsWith('92') || userId.startsWith('+92')) {
      // This is a phone number, find the user ID
      const user = await prisma.user.findUnique({
        where: { phoneNumber: userId }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      actualUserId = user.id;
    }

    const healthStats = await prisma.healthStats.findUnique({
      where: { userId: actualUserId },
    });

    if (!healthStats) {
      return res.json({
        success: true,
        data: {
          overallHealth: 0,
          organStats: [
            { name: 'Blood Pressure', value: 0, icon: 'favorite' },
            { name: 'Stomach', value: 0, icon: 'restaurant' },
            { name: 'Skin', value: 0, icon: 'face' },
            { name: 'Liver', value: 0, icon: 'local-hospital' },
            { name: 'Head', value: 0, icon: 'psychology' }
          ],
          lastUpdated: null
        }
      });
    }

    // Calculate overall health percentage
    const total = healthStats.bloodPressure + healthStats.stomach + 
                  healthStats.skin + healthStats.liver + healthStats.head;
    const overallHealth = Math.round(total / 5);

    const organStats = [
      { name: 'Blood Pressure', value: healthStats.bloodPressure, icon: 'favorite' },
      { name: 'Stomach', value: healthStats.stomach, icon: 'restaurant' },
      { name: 'Skin', value: healthStats.skin, icon: 'face' },
      { name: 'Liver', value: healthStats.liver, icon: 'local-hospital' },
      { name: 'Head', value: healthStats.head, icon: 'psychology' }
    ];

    res.json({
      success: true,
      data: {
        overallHealth,
        organStats,
        lastUpdated: healthStats.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching health stats summary:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Check if it's a database connection error
    if (error.code === 'P1001' || error.message.includes('connect')) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please check if the database is running.'
      });
    }
    
    // Check if it's a Prisma client error
    if (error.code && error.code.startsWith('P')) {
      return res.status(500).json({
        success: false,
        message: 'Database error occurred. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health stats summary',
      error: error.message
    });
  }
});

module.exports = router;
