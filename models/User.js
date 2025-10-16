const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'ur']
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for phone number
userSchema.index({ phoneNumber: 1 });

// Index for last active
userSchema.index({ lastActive: -1 });

module.exports = mongoose.model('User', userSchema);
