# Treatment System Documentation

## Overview
The treatment system allows clinics to offer multiple treatments with detailed pricing, medical information, and scheduling capabilities. All clinic and treatment data is manually managed by admin users - no third-party API integrations are used.

## Database Schema

### Treatment Model
The `Treatment` model includes comprehensive information about medical treatments offered by clinics:

#### Core Information
- `id`: Unique identifier
- `name`: Treatment name (e.g., "Echocardiogram", "Dental Implant")
- `description`: Detailed description of the treatment
- `category`: Main category (e.g., "Cardiology", "Dentistry", "General")
- `subcategory`: Specific subcategory (e.g., "Echocardiogram", "Dental Implant")

#### Pricing Information
- `basePrice`: Base price in cents (e.g., 10000 = $100.00)
- `priceRange`: JSON object with min/max prices `{ min: 10000, max: 50000 }`
- `currency`: 3-character currency code (default: "USD")
- `isPriceNegotiable`: Boolean indicating if price can be negotiated

#### Duration and Scheduling
- `duration`: Treatment duration in minutes
- `preparationTime`: Required preparation time in minutes
- `recoveryTime`: Expected recovery time in minutes
- `maxDailyBookings`: Maximum number of bookings per day

#### Medical Information
- `requirements`: Array of requirements (e.g., ["Fasting", "Blood Test"])
- `contraindications`: Array of contraindications (e.g., ["Pregnancy", "Heart Condition"])
- `sideEffects`: Array of potential side effects
- `successRate`: Success rate percentage (0-100)

#### Availability
- `status`: TreatmentStatus enum (ACTIVE, INACTIVE, PENDING, DISCONTINUED)
- `isAvailable`: Boolean for immediate availability

#### Additional Information
- `equipment`: Array of required equipment
- `certifications`: Array of required certifications
- `insuranceCoverage`: Array of accepted insurance providers
- `ageRestrictions`: JSON object with age limits `{ min: 18, max: 65 }`

#### Clinic Relationship
- `clinicId`: Foreign key to Clinic model
- `clinic`: Belongs to one clinic

### TreatmentAppointment Model
Handles appointments for specific treatments:
- `id`: Unique identifier
- `treatmentId`: Foreign key to Treatment
- `userId`: Foreign key to User
- `appointmentDate`: Scheduled date and time
- `duration`: Actual appointment duration
- `status`: Appointment status (scheduled, completed, cancelled, rescheduled)
- `notes`: Additional notes
- `price`: Final price charged (in cents)

## API Endpoints

### Treatment Management (Admin Only)

#### Create Treatment
```
POST /api/treatments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Echocardiogram",
  "description": "Ultrasound examination of the heart",
  "category": "Cardiology",
  "subcategory": "Echocardiogram",
  "basePrice": 25000,
  "priceRange": {"min": 20000, "max": 30000},
  "currency": "USD",
  "isPriceNegotiable": false,
  "duration": 60,
  "preparationTime": 15,
  "recoveryTime": 0,
  "requirements": ["Fasting 4 hours"],
  "contraindications": ["Pregnancy"],
  "sideEffects": ["Mild discomfort"],
  "successRate": 95.5,
  "isAvailable": true,
  "maxDailyBookings": 8,
  "clinicId": 1,
  "equipment": ["Ultrasound machine", "ECG monitor"],
  "certifications": ["Cardiology Board Certified"],
  "insuranceCoverage": ["Blue Cross", "Aetna"],
  "ageRestrictions": {"min": 18, "max": 80}
}
```

#### Get All Treatments
```
GET /api/treatments?page=1&limit=20&clinicId=1&category=Cardiology&status=ACTIVE&search=echo
```

#### Get Treatment by ID
```
GET /api/treatments/1
```

#### Update Treatment
```
PUT /api/treatments/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "basePrice": 30000,
  "isAvailable": false
}
```

#### Delete Treatment
```
DELETE /api/treatments/1
Authorization: Bearer <admin_token>
```

#### Get Treatments by Clinic
```
GET /api/treatments/clinic/1?category=Cardiology&isAvailable=true
```

#### Get Treatment Statistics
```
GET /api/treatments/stats/overview
Authorization: Bearer <admin_token>
```

### Updated Clinic Endpoints

All clinic endpoints now include treatment information:

#### Get Clinic with Treatments
```
GET /api/clinics/1
```

Response includes:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Heart Care Clinic",
    "treatments": [
      {
        "id": 1,
        "name": "Echocardiogram",
        "description": "Ultrasound examination of the heart",
        "category": "Cardiology",
        "basePrice": 25000,
        "currency": "USD",
        "duration": 60,
        "isAvailable": true,
        "status": "ACTIVE"
      }
    ],
    "_count": {
      "treatments": 5
    }
  }
}
```

## Validation Rules

### Treatment Creation/Update
- `name`: Required, 2-100 characters
- `description`: Optional, max 1000 characters
- `category`: Optional, max 50 characters
- `subcategory`: Optional, max 50 characters
- `basePrice`: Optional, positive integer (in cents)
- `currency`: Optional, 3-character code
- `duration`: Optional, positive integer (minutes)
- `preparationTime`: Optional, non-negative integer (minutes)
- `recoveryTime`: Optional, non-negative integer (minutes)
- `successRate`: Optional, 0-100 float
- `maxDailyBookings`: Optional, positive integer
- `clinicId`: Required, positive integer
- Array fields: `requirements`, `contraindications`, `sideEffects`, `equipment`, `certifications`, `insuranceCoverage`

## Usage Examples

### Adding a Cardiology Treatment
```javascript
const treatmentData = {
  name: "Stress Test",
  description: "Exercise stress test to evaluate heart function",
  category: "Cardiology",
  subcategory: "Stress Test",
  basePrice: 15000,
  priceRange: { min: 12000, max: 18000 },
  currency: "USD",
  isPriceNegotiable: true,
  duration: 45,
  preparationTime: 30,
  recoveryTime: 15,
  requirements: ["Fasting 8 hours", "No caffeine 24 hours"],
  contraindications: ["Recent heart attack", "Unstable angina"],
  sideEffects: ["Fatigue", "Chest discomfort"],
  successRate: 92.0,
  isAvailable: true,
  maxDailyBookings: 6,
  clinicId: 1,
  equipment: ["Treadmill", "ECG machine", "Blood pressure monitor"],
  certifications: ["Cardiology Board Certified", "Exercise Physiology"],
  insuranceCoverage: ["Blue Cross", "Aetna", "Cigna"],
  ageRestrictions: { min: 18, max: 75 }
};
```

### Adding a Dental Treatment
```javascript
const dentalTreatment = {
  name: "Dental Implant",
  description: "Surgical placement of titanium implant",
  category: "Dentistry",
  subcategory: "Oral Surgery",
  basePrice: 300000,
  priceRange: { min: 250000, max: 400000 },
  currency: "USD",
  isPriceNegotiable: false,
  duration: 120,
  preparationTime: 20,
  recoveryTime: 1440, // 24 hours
  requirements: ["X-ray", "Bone density test"],
  contraindications: ["Diabetes", "Smoking"],
  sideEffects: ["Swelling", "Bruising", "Mild pain"],
  successRate: 95.0,
  isAvailable: true,
  maxDailyBookings: 3,
  clinicId: 2,
  equipment: ["Surgical drill", "Titanium implants", "Bone graft materials"],
  certifications: ["Oral Surgery Board Certified", "Implant Specialist"],
  insuranceCoverage: ["Delta Dental", "MetLife"],
  ageRestrictions: { min: 18, max: 80 }
};
```

## Key Features

1. **Comprehensive Pricing**: Support for base prices, price ranges, and negotiable pricing
2. **Medical Safety**: Detailed requirements, contraindications, and side effects
3. **Scheduling**: Duration, preparation, and recovery time tracking
4. **Availability Management**: Status tracking and daily booking limits
5. **Equipment & Certifications**: Track required equipment and certifications
6. **Insurance Integration**: Track accepted insurance providers
7. **Age Restrictions**: Flexible age limit configuration
8. **Clinic Integration**: Seamless integration with existing clinic system

## Admin Workflow

1. **Create Clinic**: Admin creates clinic with basic information
2. **Add Treatments**: Admin adds treatments with detailed medical and pricing information
3. **Manage Availability**: Admin can activate/deactivate treatments and set booking limits
4. **Update Information**: Admin can update pricing, requirements, and other details
5. **Monitor Statistics**: Admin can view treatment statistics and clinic performance

## Security

- All treatment management endpoints require admin authentication
- Input validation prevents invalid data entry
- Price information stored in cents to avoid floating-point precision issues
- Comprehensive error handling and logging

## Future Enhancements

- Treatment package deals
- Seasonal pricing adjustments
- Treatment reviews and ratings
- Automated availability updates
- Integration with appointment scheduling systems
- Treatment recommendation engine
