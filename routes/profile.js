const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Update user profile with basic information
router.post('/update', async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, dateOfBirth, age, gender, weight, email, avatar } = req.body;

    console.log('📝 Profile update request:', {
      phoneNumber,
      firstName,
      lastName,
      dateOfBirth,
      age,
      gender,
      weight,
      email,
      avatar: avatar ? 'provided' : 'not provided'
    });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find user by phone number
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (age !== undefined && age !== null && age !== '') updateData.age = parseInt(age);
    if (gender !== undefined && gender !== null && gender !== '') updateData.gender = gender.toUpperCase();
    if (weight !== undefined && weight !== null && weight !== '') updateData.weight = parseFloat(weight);
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { phoneNumber },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        age: true,
        gender: true,
        weight: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ User profile updated:', {
      phoneNumber,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Get user profile
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        age: true,
        gender: true,
        weight: true,
        email: true,
        language: true,
        notifications: true,
        createdAt: true,
        updatedAt: true,
        lastActive: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// Get user statistics (for admin/dashboard use)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({
      where: { isVerified: true }
    });

    // Age statistics
    const ageStats = await prisma.user.aggregate({
      where: {
        age: { not: null }
      },
      _avg: { age: true },
      _min: { age: true },
      _max: { age: true }
    });

    // Gender distribution
    const genderStats = await prisma.user.groupBy({
      by: ['gender'],
      where: {
        gender: { not: null }
      },
      _count: { gender: true }
    });

    // Weight statistics
    const weightStats = await prisma.user.aggregate({
      where: {
        weight: { not: null }
      },
      _avg: { weight: true },
      _min: { weight: true },
      _max: { weight: true }
    });

    // Users with complete profiles
    const completeProfiles = await prisma.user.count({
      where: {
        firstName: { not: null },
        lastName: { not: null },
        dateOfBirth: { not: null },
        gender: { not: null },
        weight: { not: null }
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        completeProfiles,
        ageStats: {
          average: ageStats._avg.age,
          min: ageStats._min.age,
          max: ageStats._max.age
        },
        weightStats: {
          average: weightStats._avg.weight,
          min: weightStats._min.weight,
          max: weightStats._max.weight
        },
        genderDistribution: genderStats.map(stat => ({
          gender: stat.gender,
          count: stat._count.gender
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

module.exports = router;
