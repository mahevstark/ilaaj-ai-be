const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// Send message to n8n webhook
const sendToN8n = async (messageData) => {
  try {
    const formData = new FormData();
    
    // Add message data
    formData.append('MessageType', messageData.type);
    formData.append('Body', messageData.text || '');
    formData.append('WaId', messageData.phoneNumber);
    formData.append('From', `whatsapp:${messageData.phoneNumber}`);
    formData.append('To', `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`);
    formData.append('AccountSid', process.env.TWILIO_ACCOUNT_SID);
    formData.append('ApiVersion', '2010-04-01');
    
    // Add mobile app specific data
    if (messageData.source === 'mobile_app') {
      formData.append('Source', 'mobile_app');
      formData.append('MobileWebhookUrl', messageData.mobileWebhookUrl);
      formData.append('SessionId', messageData.sessionId);
    }

    // Add media if present
    if (messageData.mediaPath) {
      const mediaStream = fs.createReadStream(messageData.mediaPath);
      formData.append('MediaUrl0', mediaStream);
    }

    const response = await axios.post(process.env.N8N_WEBHOOK_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error('n8n webhook error:', error);
    throw new Error('Failed to process message with AI');
  }
};

// Send message
router.post('/send', [
  auth,
  upload.single('media'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['text', 'image', 'audio', 'video']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { message, type } = req.body;
    const userId = req.user.id;
    const phoneNumber = req.user.phoneNumber;
    const sessionId = uuidv4();

    // Prepare message data for n8n
    const messageData = {
      text: message,
      type: type || 'text',
      phoneNumber,
      mediaPath: req.file ? req.file.path : null,
      source: 'mobile_app', // Flag to indicate this is from mobile app
      mobileWebhookUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/mobile/mobile-response`,
      sessionId: sessionId
    };

    // Save message to database
    const newMessage = await prisma.message.create({
      data: {
        userId,
        phoneNumber,
        sessionId,
        text: message,
        type: (type || 'text').toUpperCase(),
        mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
        mediaType: req.file ? req.file.mimetype : null,
        mediaSize: req.file ? req.file.size : null,
        direction: 'outbound',
        status: 'SENT'
      }
    });

    // Send to n8n webhook
    let n8nResponse;
    try {
      n8nResponse = await sendToN8n(messageData);
      
      // Update message with n8n response
      await prisma.message.update({
        where: { id: newMessage.id },
        data: {
          n8nResponse: n8nResponse,
          status: 'DELIVERED'
        }
      });

    } catch (n8nError) {
      console.error('n8n error:', n8nError);
      await prisma.message.update({
        where: { id: newMessage.id },
        data: { status: 'FAILED' }
      });
    }

    // Update user's last active time
    await prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() }
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: newMessage.id,
        sessionId,
        status: newMessage.status
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get messages
router.get('/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, sessionId } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (sessionId) {
      where.sessionId = sessionId;
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await prisma.message.count({ where });

    // Format messages for frontend
    const formattedMessages = messages.map(msg => {
      const formattedMsg = {
        id: msg.id,
        text: msg.text,
        type: msg.type.toLowerCase(),
        isUser: msg.direction === 'outbound',
        timestamp: msg.createdAt,
        status: msg.status.toLowerCase()
      };

      // Add media object if media exists
      if (msg.mediaUrl) {
        formattedMsg.media = {
          uri: msg.mediaUrl,
          type: msg.mediaType,
          size: msg.mediaSize
        };
        console.log(`📱 Formatted message with media:`, {
          id: msg.id,
          type: msg.type.toLowerCase(),
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType
        });
      }

      return formattedMsg;
    }).reverse();

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get message by ID
router.get('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findFirst({
      where: { id: messageId, userId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Format message for frontend
    const formattedMessage = {
      id: message.id,
      text: message.text,
      type: message.type.toLowerCase(),
      isUser: message.direction === 'outbound',
      timestamp: message.createdAt,
      status: message.status.toLowerCase()
    };

    // Add media object if media exists
    if (message.mediaUrl) {
      formattedMessage.media = {
        uri: message.mediaUrl,
        type: message.mediaType,
        size: message.mediaSize
      };
    }

    res.json({
      success: true,
      data: {
        message: formattedMessage
      }
    });

  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete message
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findFirst({
      where: { id: messageId, userId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Delete associated media file if exists
    if (message.mediaUrl) {
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', message.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete message from database
    await prisma.message.delete({
      where: { id: messageId }
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Clear chat history
router.delete('/messages', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages with media files
    const messages = await prisma.message.findMany({
      where: { 
        userId,
        mediaUrl: { not: null }
      }
    });
    
    // Delete media files
    messages.forEach(message => {
      if (message.mediaUrl) {
        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', message.mediaUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    // Delete all messages
    await prisma.message.deleteMany({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
