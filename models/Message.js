const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  content: {
    text: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video'],
      default: 'text'
    },
    mediaUrl: {
      type: String
    },
    mediaType: {
      type: String
    },
    mediaSize: {
      type: Number
    }
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  n8nResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  sessionId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ phoneNumber: 1, createdAt: -1 });
messageSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
