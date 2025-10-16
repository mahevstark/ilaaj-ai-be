# Bandage Backend API

Node.js backend API for the Bandage AI Medical Assistant mobile application.

## Features

- 🔐 **Authentication** - JWT-based authentication with OTP verification
- 💬 **Chat Management** - Message storage and retrieval
- 📱 **SMS Integration** - Twilio SMS for OTP delivery
- 🤖 **AI Integration** - n8n webhook integration for AI responses
- 📁 **File Upload** - Multimedia file handling (images, audio, video)
- 🛡️ **Security** - Rate limiting, input validation, error handling
- 📊 **Database** - PostgreSQL with Prisma ORM for data persistence

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher) or Railway PostgreSQL
- Twilio account with SMS capabilities
- n8n workflow deployed and accessible

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bandage-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database setup**
   ```bash
   # Run the database setup script from the root directory
   node setup-database.js
   # Follow the prompts to configure PostgreSQL
   ```

4. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgresql://username:password@host:port/database?schema=public
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   JWT_SECRET=your_jwt_secret_key
   N8N_WEBHOOK_URL=https://n8n.fictiondevelopers.com/webhook/incoming-wa-msg-2000
   ```

5. **Database initialization**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # (Optional) Seed database
   npm run db:seed
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication

#### Send OTP
```
POST /api/auth/send-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

#### Verify OTP
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile
```
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "email": "john@example.com"
}
```

### Chat

#### Send Message
```
POST /api/chat/send
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "message": "Hello",
  "type": "text",
  "media": <file> // optional
}
```

#### Get Messages
```
GET /api/chat/messages?page=1&limit=50&sessionId=uuid
Authorization: Bearer <jwt_token>
```

#### Get Message by ID
```
GET /api/chat/messages/:messageId
Authorization: Bearer <jwt_token>
```

#### Delete Message
```
DELETE /api/chat/messages/:messageId
Authorization: Bearer <jwt_token>
```

#### Clear Chat History
```
DELETE /api/chat/messages
Authorization: Bearer <jwt_token>
```

## Database Schema

The database uses PostgreSQL with Prisma ORM. The schema is defined in `prisma/schema.prisma`.

### User Model
```prisma
model User {
  id          String   @id @default(cuid())
  phoneNumber String   @unique
  isVerified  Boolean  @default(false)
  firstName   String?
  lastName    String?
  dateOfBirth String?
  gender      Gender?
  email       String?
  language    String   @default("en")
  notifications Boolean @default(true)
  lastActive  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  messages Message[]
  otps     OTP[]
}
```

### OTP Model
```prisma
model OTP {
  id          String   @id @default(cuid())
  phoneNumber String
  code        String   @db.VarChar(6)
  expiresAt   DateTime
  attempts    Int      @default(0)
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user User? @relation(fields: [phoneNumber], references: [phoneNumber])
}
```

### Message Model
```prisma
model Message {
  id          String      @id @default(cuid())
  userId      String
  phoneNumber String
  sessionId   String
  text        String?
  type        MessageType @default(TEXT)
  mediaUrl    String?
  mediaType   String?
  mediaSize   Int?
  direction   String      @default("outbound")
  status      Status      @default(SENT)
  n8nResponse Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Enums
```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
}

enum MessageType {
  TEXT
  IMAGE
  AUDIO
  VIDEO
}

enum Status {
  SENT
  DELIVERED
  READ
  FAILED
}
```

## Integration with n8n

The backend integrates with your existing n8n workflow by sending messages to the webhook endpoint. The integration includes:

1. **Message Formatting** - Converts mobile app messages to Twilio webhook format
2. **Media Handling** - Uploads and processes multimedia files
3. **Response Processing** - Handles AI responses from n8n
4. **Session Management** - Maintains conversation context

### Webhook Payload Format
```javascript
{
  MessageType: "text|image|audio|video",
  Body: "message text",
  WaId: "phone_number",
  From: "whatsapp:phone_number",
  To: "whatsapp:twilio_number",
  AccountSid: "twilio_account_sid",
  ApiVersion: "2010-04-01",
  MediaUrl0: "media_file_url" // optional
}
```

## Security Features

- **Rate Limiting** - Prevents API abuse
- **Input Validation** - Validates all incoming data
- **JWT Authentication** - Secure token-based auth
- **File Upload Security** - Type and size validation
- **Error Handling** - Comprehensive error management
- **CORS Protection** - Configurable cross-origin policies

## File Upload

The API supports uploading various media types:

- **Images**: JPEG, PNG, GIF
- **Audio**: MP3, M4A, WAV
- **Video**: MP4, MOV

Files are stored in the `uploads/` directory and served statically.

## Error Handling

The API returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [] // validation errors if applicable
}
```

## Development

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# View database in browser
npm run db:studio

# Seed database
npm run db:seed
```

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

## Deployment

### Environment Variables
Ensure all required environment variables are set in production:

- `NODE_ENV=production`
- `DATABASE_URL` - Production PostgreSQL connection string
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `JWT_SECRET` - Strong JWT secret key
- `N8N_WEBHOOK_URL` - Production n8n webhook URL

### Production Considerations
- Use a process manager like PM2
- Set up reverse proxy with Nginx
- Configure SSL/TLS certificates
- Set up monitoring and logging
- Regular database backups

## Monitoring

The API includes health check endpoint:
```
GET /health
```

Returns server status, uptime, and timestamp.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
