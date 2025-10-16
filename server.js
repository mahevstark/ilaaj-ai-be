const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const mobileWebhookRoutes = require('./routes/mobile-webhook');
const profileRoutes = require('./routes/profile');
const healthStatsRoutes = require('./routes/healthStats');
const uploadRoutes = require('./routes/upload');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:19006', 'http://localhost:3000', 'http://192.168.100.216:3000', 'http://192.168.100.216:8082'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:19006', 'http://localhost:3000', 'http://192.168.100.216:3000', 'http://192.168.100.216:8082'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiting for health stats API
const healthStatsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for health stats (increased for better UX)
  message: 'Too many health stats requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mobile', mobileWebhookRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/health-stats', healthStatsLimiter, healthStatsRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// WebSocket connection handling
const connectedUsers = new Map(); // Store user connections by userId
const connectionCounts = new Map(); // Track connections per user
const MAX_CONNECTIONS_PER_USER = 3; // Limit connections per user

io.on('connection', (socket) => {
  console.log(`🔌 New WebSocket connection: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', (data) => {
    const { userId, phoneNumber } = data;
    if (userId && phoneNumber) {
      // Check connection limit
      const currentConnections = connectionCounts.get(userId) || 0;
      if (currentConnections >= MAX_CONNECTIONS_PER_USER) {
        console.log(`⚠️  Connection limit reached for user ${phoneNumber} (${userId})`);
        socket.emit('error', { message: 'Too many connections. Please close other tabs/apps.' });
        socket.disconnect();
        return;
      }
      
      // Close existing connections for this user if they exceed limit
      if (connectedUsers.has(userId)) {
        const existingSocket = connectedUsers.get(userId);
        if (existingSocket && existingSocket.connected) {
          existingSocket.disconnect();
        }
      }
      
      connectedUsers.set(userId, socket);
      connectionCounts.set(userId, currentConnections + 1);
      socket.userId = userId;
      socket.phoneNumber = phoneNumber;
      console.log(`👤 User authenticated: ${phoneNumber} (${userId}) - Connections: ${currentConnections + 1}`);
      
      // Join user to their personal room
      socket.join(`user_${userId}`);
      socket.emit('authenticated', { success: true });
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { message, type, media } = data;
      const userId = socket.userId;
      const phoneNumber = socket.phoneNumber;

      if (!userId || !phoneNumber) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Save message to database
      const prisma = require('./lib/prisma');
      
      // Map message type to enum
      const messageType = type === 'image' ? 'IMAGE' : 
                         type === 'audio' ? 'AUDIO' : 
                         type === 'video' ? 'VIDEO' : 'TEXT';
      
      const messageRecord = await prisma.message.create({
        data: {
          userId,
          phoneNumber,
          sessionId: `mobile_${userId}_${Date.now()}`,
          text: message,
          type: messageType,
          direction: 'outbound',
          status: 'SENT',
          mediaUrl: media?.uri || null,
          mediaType: media?.type || null,
          mediaSize: media?.size || null,
        }
      });

      // Don't emit user messages back to client (they're already added locally)
      // Only emit bot responses via the mobile-webhook route

      // Send to n8n webhook for AI processing
      const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.fictiondevelopers.com/webhook/incoming-wa-msg-2000';
      
      const webhookData = {
        WaId: phoneNumber,
        Body: message,
        MessageType: type || 'text',
        Source: 'mobile_app',
        MobileWebhookUrl: `https://0ad7a349c52d.ngrok-free.app/api/mobile/mobile-response`,
        SessionId: `mobile_${userId}_${Date.now()}`,
        from: phoneNumber,
        MediaUrl0: media?.cloudinaryUrl || media?.uri || '',
        Caption: media?.caption || '',
        // Cloudinary audio file data
        AudioFile: media?.cloudinaryUrl || media?.uri || null,
        AudioType: media?.type || null,
        AudioName: media?.name || null,
        PublicId: media?.publicId || null,
        Duration: media?.duration || null
      };
      
      console.log('🔍 Sending to n8n webhook:', JSON.stringify(webhookData, null, 2));
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        });

        if (!response.ok) {
          console.error('Failed to send to n8n webhook:', response.status);
        } else {
          console.log('✅ Successfully sent to n8n webhook');
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Decrease connection count
      const currentConnections = connectionCounts.get(socket.userId) || 0;
      if (currentConnections > 1) {
        connectionCounts.set(socket.userId, currentConnections - 1);
      } else {
        connectionCounts.delete(socket.userId);
      }
      
      console.log(`👋 User disconnected: ${socket.phoneNumber} (${socket.userId})`);
    }
    console.log(`🔌 WebSocket disconnected: ${socket.id}`);
  });
});

// Function to send message to specific user
const sendMessageToUser = (userId, message) => {
  const userSocket = connectedUsers.get(userId);
  if (userSocket) {
    userSocket.emit('message_received', message);
    return true;
  }
  return false;
};

// Make io and sendMessageToUser available globally
app.set('io', io);
app.set('sendMessageToUser', sendMessageToUser);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready`);
});

module.exports = { app, server, io };
