# Clinic Management API Documentation

## Overview
This API provides comprehensive clinic management functionality with support for both manual admin operations and third-party integrations. The system is designed to handle up to 2 million users with optimized database queries and caching.

## Features
- ✅ Full CRUD operations for clinics
- ✅ Third-party API integration (Google Places, Yelp, Healthgrades)
- ✅ Geospatial search capabilities
- ✅ Advanced filtering and pagination
- ✅ Rate limiting and security
- ✅ Bulk operations support
- ✅ Comprehensive validation
- ✅ Performance optimized for scale

## Base URL
```
http://localhost:8000/api/clinics
```

## Authentication
All routes except public ones require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting
- **General routes**: 100 requests per 15 minutes
- **Strict routes**: 20 requests per 15 minutes  
- **Bulk operations**: 5 operations per hour

## API Endpoints

### Public Routes (No Authentication Required)

#### 1. Search Clinics by Location
```http
GET /api/clinics/search/location
```

**Query Parameters:**
- `latitude` (required): Latitude coordinate (-90 to 90)
- `longitude` (required): Longitude coordinate (-180 to 180)
- `radius` (optional): Search radius in km (0.1 to 100, default: 10)
- `limit` (optional): Maximum results (1 to 100, default: 20)

**Example:**
```bash
curl "http://localhost:8000/api/clinics/search/location?latitude=40.7128&longitude=-74.0060&radius=5&limit=10"
```

#### 2. Get Clinic Statistics
```http
GET /api/clinics/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClinics": 1250,
    "averageRating": 4.2,
    "statusBreakdown": [
      { "status": "ACTIVE", "_count": { "id": 1000 } },
      { "status": "PENDING", "_count": { "id": 200 } },
      { "status": "INACTIVE", "_count": { "id": 50 } }
    ],
    "typeBreakdown": [
      { "clinicType": "DENTAL", "_count": { "id": 800 } },
      { "clinicType": "MEDICAL", "_count": { "id": 300 } }
    ],
    "verificationBreakdown": [
      { "isVerified": true, "_count": { "id": 600 } },
      { "isVerified": false, "_count": { "id": 650 } }
    ]
  }
}
```

### Protected Routes (Authentication Required)

#### 3. Create Clinic (Admin Only)
```http
POST /api/clinics
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Downtown Dental Clinic",
  "description": "Modern dental care in the heart of the city",
  "email": "info@downtowndental.com",
  "phone": "+1-555-0123",
  "website": "https://downtowndental.com",
  "address": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "clinicType": "DENTAL",
  "licenseNumber": "DENT123456",
  "taxId": "12-3456789",
  "contactPerson": "Dr. John Smith",
  "contactEmail": "dr.smith@downtowndental.com",
  "contactPhone": "+1-555-0124",
  "emergencyContact": "+1-555-0125",
  "services": ["General Dentistry", "Cosmetic Dentistry", "Orthodontics"],
  "specialties": ["Oral Surgery", "Periodontics"],
  "languages": ["English", "Spanish"],
  "operatingHours": {
    "monday": { "open": "9:00 AM", "close": "5:00 PM" },
    "tuesday": { "open": "9:00 AM", "close": "5:00 PM" },
    "wednesday": "closed"
  },
  "socialMedia": {
    "facebook": "https://facebook.com/downtowndental",
    "instagram": "https://instagram.com/downtowndental"
  },
  "maxPatients": 1000,
  "pricingTier": "premium",
  "acceptsInsurance": true,
  "insuranceProviders": ["Aetna", "Blue Cross", "Cigna"]
}
```

#### 4. Get All Clinics (Admin Only)
```http
GET /api/clinics
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (ACTIVE, INACTIVE, PENDING, SUSPENDED)
- `clinicType` (optional): Filter by type (DENTAL, MEDICAL, SPECIALIZED, MULTI_SPECIALTY)
- `city` (optional): Filter by city
- `country` (optional): Filter by country
- `isVerified` (optional): Filter by verification status (true/false)
- `search` (optional): Search in name, description, city, specialties
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc/desc, default: desc)

**Example:**
```bash
curl "http://localhost:8000/api/clinics?page=1&limit=10&status=ACTIVE&city=New York&search=dental"
```

#### 5. Get Clinic by ID
```http
GET /api/clinics/:id
```

**Example:**
```bash
curl "http://localhost:8000/api/clinics/1"
```

#### 6. Update Clinic (Admin Only)
```http
PUT /api/clinics/:id
```

**Request Body:** Same as create clinic, but all fields are optional.

#### 7. Delete Clinic (Admin Only)
```http
DELETE /api/clinics/:id
```

### Third-Party Integration Routes (Admin Only)

#### 8. Sync Single Clinic from Third-Party
```http
POST /api/clinics/sync/third-party
```

**Request Body:**
```json
{
  "source": "google_places",
  "thirdPartyId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "clinicData": {
    "name": "Google Places Clinic",
    "address": "123 Google Street",
    "city": "Mountain View",
    "country": "USA",
    "rating": 4.5,
    "reviewCount": 150
  }
}
```

#### 9. Bulk Sync Clinics from Third-Party
```http
POST /api/clinics/sync/bulk
```

**Request Body:**
```json
{
  "source": "google_places",
  "clinics": [
    {
      "id": "place_id_1",
      "name": "Clinic 1",
      "address": "Address 1"
    },
    {
      "id": "place_id_2", 
      "name": "Clinic 2",
      "address": "Address 2"
    }
  ]
}
```

## Database Schema

### Clinic Model
```prisma
model Clinic {
  id                Int            @id @default(autoincrement())
  name              String
  slug              String         @unique
  description       String?
  email             String         @unique
  phone             String?
  website           String?
  
  // Address Information
  address           String
  city              String
  state             String?
  country           String
  postalCode        String?
  latitude          Float?
  longitude         Float?
  
  // Business Information
  clinicType        ClinicType     @default(DENTAL)
  status            ClinicStatus   @default(PENDING)
  licenseNumber     String?
  taxId             String?
  registrationDate  DateTime?
  
  // Contact Information
  contactPerson     String?
  contactEmail      String?
  contactPhone      String?
  emergencyContact  String?
  
  // Services and Specialties
  services          String[]       @default([])
  specialties       String[]       @default([])
  languages         String[]       @default([])
  
  // Operating Hours (JSON format)
  operatingHours    Json?
  
  // Social Media and Online Presence
  socialMedia       Json?
  onlinePresence    Json?
  
  // Third-party Integration
  thirdPartyId      String?        @unique
  thirdPartySource  String?
  thirdPartyData    Json?
  lastSyncedAt      DateTime?
  
  // Verification and Quality
  isVerified        Boolean        @default(false)
  verificationDate  DateTime?
  rating            Float?         @default(0.0)
  reviewCount       Int            @default(0)
  
  // Capacity and Statistics
  maxPatients       Int?
  currentPatients   Int            @default(0)
  totalAppointments Int            @default(0)
  
  // Financial Information
  pricingTier       String?
  acceptsInsurance  Boolean        @default(false)
  insuranceProviders String[]      @default([])
  
  // System Fields
  createdBy         Int?
  updatedBy         Int?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  users             User[]
  appointments      Appointment[]
  reviews           ClinicReview[]
  
  // Indexes for performance
  @@index([status])
  @@index([clinicType])
  @@index([city])
  @@index([country])
  @@index([thirdPartySource])
  @@index([isVerified])
  @@index([createdAt])
}
```

## Performance Optimizations

### Database Indexes
- Status-based queries
- Clinic type filtering
- Geographic searches
- Third-party source lookups
- Verification status checks
- Creation date sorting

### Caching Strategy
- Redis caching for frequently accessed clinics
- Query result caching for location-based searches
- Third-party API response caching

### Scalability Features
- Pagination for large datasets
- Batch processing for bulk operations
- Rate limiting to prevent abuse
- Database connection pooling
- Optimized queries with proper indexing

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/implaner_db"

# Third-party API Keys
GOOGLE_PLACES_API_KEY="your_google_places_api_key"
YELP_API_KEY="your_yelp_api_key"
HEALTHGRADES_API_KEY="your_healthgrades_api_key"

# JWT
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRES_IN="7d"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (for caching)
REDIS_URL="redis://localhost:6379"
```

## Installation and Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Generate Prisma Client:**
```bash
npm run gen
```

3. **Run Database Migration:**
```bash
npx prisma migrate dev
```

4. **Start the Server:**
```bash
npm run dev
```

## Testing the API

### Using cURL

1. **Create a clinic:**
```bash
curl -X POST http://localhost:8000/api/clinics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Dental Clinic",
    "email": "test@dental.com",
    "address": "123 Test Street",
    "city": "Test City",
    "country": "Test Country"
  }'
```

2. **Search clinics by location:**
```bash
curl "http://localhost:8000/api/clinics/search/location?latitude=40.7128&longitude=-74.0060&radius=10"
```

### Using Postman

Import the provided Postman collection or create requests manually using the endpoint documentation above.

## Monitoring and Analytics

### Key Metrics to Monitor
- API response times
- Database query performance
- Third-party API response times
- Rate limit hits
- Error rates by endpoint
- Geographic distribution of searches

### Recommended Tools
- Application Performance Monitoring (APM)
- Database query monitoring
- Log aggregation (ELK stack)
- Uptime monitoring
- Error tracking (Sentry)

## Security Considerations

1. **Input Validation**: All inputs are validated using express-validator
2. **Rate Limiting**: Prevents abuse and ensures fair usage
3. **Authentication**: JWT-based authentication for protected routes
4. **Authorization**: Role-based access control
5. **SQL Injection Prevention**: Using Prisma ORM with parameterized queries
6. **CORS Configuration**: Properly configured for production
7. **Environment Variables**: Sensitive data stored in environment variables

## Future Enhancements

1. **Real-time Updates**: WebSocket support for real-time clinic updates
2. **Advanced Search**: Elasticsearch integration for full-text search
3. **Machine Learning**: Recommendation system for clinic matching
4. **Analytics Dashboard**: Real-time analytics and reporting
5. **Mobile App Support**: Optimized endpoints for mobile applications
6. **Multi-language Support**: Internationalization for global clinics
7. **Advanced Caching**: Redis-based caching for improved performance
8. **API Versioning**: Version management for backward compatibility
