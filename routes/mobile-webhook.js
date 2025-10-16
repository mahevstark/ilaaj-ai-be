const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// Webhook endpoint to receive responses from n8n for mobile app users
router.post('/mobile-response', async (req, res) => {
  try {
    console.log('📱 Mobile webhook received:', JSON.stringify(req.body, null, 2));
    
    const { phoneNumber, message, sessionId, messageType = 'text' } = req.body;

    if (!phoneNumber || !message) {
      console.log('❌ Missing required fields:', { phoneNumber: !!phoneNumber, message: !!message });
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Try to find the user in database
    let user = null;
    let botMessage = null;
    
    try {
      user = await prisma.user.findUnique({
        where: { phoneNumber }
      });

      if (!user) {
        console.log(`⚠️ User not found in database: ${phoneNumber}`);
        // Create a mock user for WebSocket purposes
        user = { id: `temp_${phoneNumber.replace('+', '')}`, phoneNumber };
      } else {
        // Map messageType to valid Prisma enum values
        let validMessageType = 'TEXT'; // Default to TEXT
        if (messageType === 'image') {
          validMessageType = 'IMAGE';
        } else if (messageType === 'audio') {
          validMessageType = 'AUDIO';
        } else if (messageType === 'video') {
          validMessageType = 'VIDEO';
        } else if (messageType === 'medical_advice' || messageType === 'regular') {
          validMessageType = 'TEXT'; // Medical advice is still text
        }

        // Save the bot response as a message
        botMessage = await prisma.message.create({
          data: {
            userId: user.id,
            phoneNumber: phoneNumber,
            sessionId: sessionId || 'mobile-session',
            text: message,
            type: validMessageType,
            direction: 'inbound',
            status: 'DELIVERED'
          }
        });

        console.log(`📱 Mobile response saved for ${phoneNumber}: ${message}`);
      }
    } catch (dbError) {
      console.log('⚠️ Database not available, using mock data:', dbError.message);
      // Create a mock user and message for WebSocket purposes
      user = { id: `temp_${phoneNumber.replace('+', '')}`, phoneNumber };
      botMessage = { id: `temp_${Date.now()}`, createdAt: new Date() };
    }

    // Send message via WebSocket if user is connected
    const sendMessageToUser = req.app.get('sendMessageToUser');
    if (sendMessageToUser) {
      const messageData = {
        id: botMessage?.id || `temp_${Date.now()}`,
        text: message,
        type: messageType,
        timestamp: botMessage?.createdAt || new Date(),
        isUser: false,
        media: null
      };
      
      const sent = sendMessageToUser(user.id, messageData);
      if (sent) {
        console.log(`🔌 Message sent via WebSocket to user ${user.id}`);
      } else {
        console.log(`⚠️ User ${user.id} not connected via WebSocket`);
      }
    }

    res.json({
      success: true,
      message: 'Response saved successfully',
      data: {
        messageId: botMessage.id,
        message: message
      }
    });

  } catch (error) {
    console.error('Mobile webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
