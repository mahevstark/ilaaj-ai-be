# Doctor-Clinic Management System

## Overview
This system implements a comprehensive doctor-clinic management solution that supports:
- **One-to-Many**: A clinic can have multiple doctors
- **Many-to-Many**: A doctor can work at multiple clinics
- **Flexible Roles**: Doctors can have different roles at different clinics
- **Scalable Architecture**: Designed to handle 2+ million users

## Database Schema

### Core Models

#### 1. Doctor Model
```prisma
model Doctor {
  id                Int            @id @default(autoincrement())
  firstName         String
  lastName          String
  email             String         @unique
  phone             String?
  specialization    String[]       @default([])
  qualifications    String[]       @default([])
  languages         String[]       @default([])
  experience        Int?           // years of experience
  licenseNumber     String?        @unique
  licenseExpiry     DateTime?
  status            DoctorStatus   @default(ACTIVE)
  bio               String?
  profileImage      String?
  
  // Contact Information
  address           String?
  city              String?
  state             String?
  country           String?
  postalCode        String?
  
  // Professional Information
  education         Json?          // Store education details as JSON
  certifications    String[]       @default([])
  awards            String[]       @default([])
  publications      String[]       @default([])
  
  // Availability
  workingHours      Json?          // Store working hours as JSON
  consultationFee   Int?           // in cents
  isAvailable       Boolean        @default(true)
  
  // System Fields
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  clinicAssociations DoctorClinic[]
  appointments      DoctorAppointment[]
}
```

#### 2. DoctorClinic Junction Model
```prisma
model DoctorClinic {
  id          Int      @id @default(autoincrement())
  doctorId    Int
  doctor      Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  clinicId    Int
  clinic      Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  role        DoctorRole @default(EMPLOYEE)
  startDate   DateTime @default(now())
  endDate     DateTime?
  isActive    Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([doctorId, clinicId])
  @@index([doctorId])
  @@index([clinicId])
  @@index([isActive])
}
```

#### 3. DoctorAppointment Model
```prisma
model DoctorAppointment {
  id          Int      @id @default(autoincrement())
  doctorId    Int
  doctor      Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointmentDate DateTime
  duration    Int?     // in minutes
  status      String   @default("scheduled")
  notes       String?
  diagnosis   String?
  treatment   String?
  prescription String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Enums

#### DoctorRole
```prisma
enum DoctorRole {
  OWNER      // Clinic owner
  PARTNER    // Business partner
  EMPLOYEE   // Regular employee
  CONTRACTOR // Independent contractor
}
```

#### DoctorStatus
```prisma
enum DoctorStatus {
  ACTIVE     // Currently practicing
  INACTIVE   // Not currently practicing
  PENDING    // Awaiting verification
  SUSPENDED  // Temporarily suspended
}
```

## API Endpoints

### Doctor Management

#### 1. Create Doctor
```http
POST /api/doctors
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "dr.smith@example.com",
  "phone": "+1-555-0123",
  "specialization": ["General Dentistry", "Orthodontics"],
  "qualifications": ["DDS", "MS in Orthodontics"],
  "languages": ["English", "Spanish"],
  "experience": 10,
  "licenseNumber": "DENT123456",
  "licenseExpiry": "2025-12-31",
  "bio": "Experienced dentist with 10 years of practice...",
  "profileImage": "https://example.com/profile.jpg",
  "address": "123 Medical Street",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "education": {
    "degree": "DDS",
    "university": "NYU College of Dentistry",
    "graduationYear": 2013
  },
  "certifications": ["Board Certified Orthodontist"],
  "awards": ["Best Dentist 2023"],
  "publications": ["Advanced Orthodontic Techniques"],
  "workingHours": {
    "monday": { "start": "9:00", "end": "17:00" },
    "tuesday": { "start": "9:00", "end": "17:00" },
    "wednesday": "closed"
  },
  "consultationFee": 15000, // $150.00 in cents
  "isAvailable": true
}
```

#### 2. Get All Doctors
```http
GET /api/doctors?page=1&limit=20&specialization=Orthodontics&city=New York&isAvailable=true
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (ACTIVE, INACTIVE, PENDING, SUSPENDED)
- `specialization`: Filter by specialization
- `city`: Filter by city
- `country`: Filter by country
- `isAvailable`: Filter by availability (true/false)
- `search`: Search in name, email, specialization, bio
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc/desc, default: desc)

#### 3. Get Doctor by ID
```http
GET /api/doctors/:id
```

#### 4. Update Doctor
```http
PUT /api/doctors/:id
```

#### 5. Delete Doctor
```http
DELETE /api/doctors/:id
```

### Doctor-Clinic Associations

#### 6. Associate Doctor with Clinic
```http
POST /api/doctors/:doctorId/clinics/:clinicId
```

**Request Body:**
```json
{
  "role": "OWNER",
  "startDate": "2024-01-01",
  "endDate": null,
  "notes": "Primary clinic owner"
}
```

#### 7. Remove Doctor from Clinic
```http
DELETE /api/doctors/:doctorId/clinics/:clinicId
```

#### 8. Get Doctors by Clinic
```http
GET /api/doctors/clinic/:clinicId?isActive=true
```

**Query Parameters:**
- `isActive`: Filter by active associations (default: true)

#### 9. Get Doctor Statistics
```http
GET /api/doctors/stats
```

## Use Cases

### 1. Clinic with Multiple Doctors
```javascript
// Create a clinic
const clinic = await prisma.clinic.create({
  data: {
    name: "Downtown Dental Clinic",
    email: "info@downtowndental.com",
    address: "123 Main Street",
    city: "New York",
    country: "USA"
  }
});

// Create doctors
const doctor1 = await prisma.doctor.create({
  data: {
    firstName: "John",
    lastName: "Smith",
    email: "dr.smith@downtowndental.com",
    specialization: ["General Dentistry"]
  }
});

const doctor2 = await prisma.doctor.create({
  data: {
    firstName: "Jane",
    lastName: "Doe",
    email: "dr.doe@downtowndental.com",
    specialization: ["Orthodontics"]
  }
});

// Associate doctors with clinic
await prisma.doctorClinic.createMany({
  data: [
    {
      doctorId: doctor1.id,
      clinicId: clinic.id,
      role: "OWNER"
    },
    {
      doctorId: doctor2.id,
      clinicId: clinic.id,
      role: "EMPLOYEE"
    }
  ]
});
```

### 2. Doctor Working at Multiple Clinics
```javascript
// Doctor works at multiple clinics
const doctor = await prisma.doctor.create({
  data: {
    firstName: "Dr. Multi",
    lastName: "Clinic",
    email: "dr.multi@example.com",
    specialization: ["General Dentistry"]
  }
});

// Associate with multiple clinics
await prisma.doctorClinic.createMany({
  data: [
    {
      doctorId: doctor.id,
      clinicId: clinic1.id,
      role: "OWNER"
    },
    {
      doctorId: doctor.id,
      clinicId: clinic2.id,
      role: "CONTRACTOR"
    }
  ]
});
```

### 3. Querying Doctor-Clinic Relationships
```javascript
// Get all doctors for a clinic
const clinicDoctors = await prisma.doctorClinic.findMany({
  where: {
    clinicId: clinicId,
    isActive: true
  },
  include: {
    doctor: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        isAvailable: true
      }
    }
  }
});

// Get all clinics for a doctor
const doctorClinics = await prisma.doctorClinic.findMany({
  where: {
    doctorId: doctorId,
    isActive: true
  },
  include: {
    clinic: {
      select: {
        id: true,
        name: true,
        city: true,
        country: true
      }
    }
  }
});
```

## Performance Optimizations

### Database Indexes
- `@@index([doctorId])` on DoctorClinic
- `@@index([clinicId])` on DoctorClinic
- `@@index([isActive])` on DoctorClinic
- `@@index([status])` on Doctor
- `@@index([specialization])` on Doctor
- `@@index([isAvailable])` on Doctor

### Query Optimization
```javascript
// Efficient query with proper includes
const doctorsWithClinics = await prisma.doctor.findMany({
  where: {
    status: 'ACTIVE',
    isAvailable: true
  },
  include: {
    clinicAssociations: {
      where: { isActive: true },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      }
    }
  },
  take: 20,
  skip: 0
});
```

## Scalability Features

### 1. Pagination
All list endpoints support pagination with configurable limits.

### 2. Filtering
Comprehensive filtering options for efficient data retrieval.

### 3. Caching Strategy
- Cache frequently accessed doctor-clinic associations
- Cache doctor availability status
- Cache clinic doctor lists

### 4. Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Strict endpoints: 20 requests per 15 minutes

## Security Features

### 1. Authentication
All endpoints require JWT authentication.

### 2. Authorization
Role-based access control:
- `ADMIN`: Full access to all operations
- `super-admin`: Full access to all operations
- `admin`: Read access to doctors and clinics

### 3. Input Validation
Comprehensive validation using express-validator:
- Email format validation
- Phone number validation
- Date validation
- JSON structure validation
- Array validation

### 4. Data Sanitization
- Email normalization
- String trimming
- XSS protection

## Error Handling

### Standard Error Response
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

### Common Error Scenarios
1. **Duplicate Email**: Doctor with email already exists
2. **Duplicate License**: Doctor with license number already exists
3. **Invalid Association**: Doctor already associated with clinic
4. **Missing Doctor/Clinic**: Referenced doctor or clinic not found
5. **Validation Errors**: Invalid input data

## Monitoring and Analytics

### Key Metrics
- Total doctors by status
- Doctor-clinic association counts
- Specialization distribution
- Geographic distribution
- Availability rates
- Appointment statistics

### Recommended Monitoring
- API response times
- Database query performance
- Error rates by endpoint
- Doctor availability tracking
- Clinic capacity utilization

## Future Enhancements

1. **Real-time Availability**: WebSocket updates for doctor availability
2. **Advanced Scheduling**: Complex scheduling algorithms
3. **Telemedicine Support**: Virtual consultation capabilities
4. **Mobile App APIs**: Optimized endpoints for mobile
5. **Analytics Dashboard**: Real-time doctor and clinic analytics
6. **Integration APIs**: Third-party calendar and scheduling systems
7. **Multi-language Support**: Internationalization for global doctors
8. **Advanced Search**: Elasticsearch integration for complex queries

This system provides a robust foundation for managing doctor-clinic relationships at scale while maintaining flexibility for various business models and use cases.
