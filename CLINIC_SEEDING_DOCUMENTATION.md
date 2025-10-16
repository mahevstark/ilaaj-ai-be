# Clinic and Treatment Seeding Documentation

## Overview
This document describes the clinic and treatment data seeding system for the Implaner backend. The system creates 5 different dental clinics with comprehensive treatment offerings and varied pricing structures.

## Data Structure

### Clinics Created
1. **Happy Smile Clinics** - Premium pricing tier
2. **Dental Excellence Center** - Luxury pricing tier  
3. **Smile Care Clinic** - Budget pricing tier
4. **Istanbul Dental Center** - Standard pricing tier
5. **Elite Dental Studio** - Exclusive pricing tier

### Pricing Tiers
- **Budget**: 30% discount from base price (0.7x multiplier)
- **Standard**: 15% discount from base price (0.85x multiplier)
- **Premium**: Base price (1.0x multiplier)
- **Luxury**: 20% premium (1.2x multiplier)
- **Exclusive**: 40% premium (1.4x multiplier)

## Treatment Categories

### 1. Crowns and Veneers
- Zirconia Porcelain Crown
- E-Max Porcelain Crown
- E-Max Porcelain Veneer
- E-max Endo Crown
- E-Max (Inley - Onley - Overlay)

### 2. Dental Implants
- Osstem Implant
- Hiossen Implant
- Nobel Implant
- Straumann Implant

### 3. Bone Augmentation
- Sinus Lifting (Internal)
- Sinus Lifting (External)
- Bone Augmentation (Stage 1-4)
- Bone Graft
- Membran 25x25

### 4. Surgical Procedures
- Flap Operation (One Jaw/Full Mouth)
- Cyst Operation
- Frenectomy
- Free Gingival Graft
- Connective Tissue Graft

### 5. Tooth Extraction
- Surgical Tooth Extraction (Stage 1-2)
- Complex Tooth Extraction
- Simple Tooth Extraction

### 6. Endodontics
- Root Canal Treatment
- Root Canal Retreatment

### 7. Restorative Dentistry
- White Filling
- Aesthetic Filling
- Fiber Post
- Kuafaj
- Fiber Splint

### 8. Preventive and Cosmetic
- Gum Curettage (Per Tooth/One Jaw/Full Mouth)
- Gum Contouring
- Full-mouth Teeth Cleaning
- Teeth Whitening
- Occlusal Splint

## Base Pricing (Agency Prices)
All prices are stored in cents (EUR) and based on the Happy Smile Clinics agency price list:

| Treatment | Base Price (€) |
|-----------|----------------|
| Zirconia Porcelain Crown | 120.00 |
| E-Max Porcelain Crown | 160.00 |
| E-Max Porcelain Veneer | 160.00 |
| Osstem Implant | 250.00 |
| Hiossen Implant | 250.00 |
| Nobel Implant | 580.00 |
| Straumann Implant | 680.00 |
| Sinus Lifting (Internal) | 100.00 |
| Sinus Lifting (External) | 390.00 |
| Bone Augmentation (Stage 1) | 800.00 |
| Bone Augmentation (Stage 2) | 850.00 |
| Bone Augmentation (Stage 3) | 1,000.00 |
| Bone Augmentation (Stage 4) | 2,400.00 |
| Root Canal Treatment | 90.00 |
| Teeth Whitening | 110.00 |

## Usage

### Running the Seed Script
```bash
# Seed clinics and treatments
npm run seed:clinics

# Reset database and seed clinics
npm run seed:reset:clinics

# Verify seeded data
node verify-clinics.js
```

### Script Files
- `seed-clinics.js` - Main seeding script
- `verify-clinics.js` - Data verification script

## Database Schema Compliance

The seeding script follows the Prisma schema exactly:

### Clinic Model
- All required fields populated
- Proper enum values used
- JSON fields for operating hours, social media, etc.
- Proper indexing fields set

### Treatment Model
- Linked to clinics via foreign key
- Pricing in cents (EUR currency)
- Proper categorization and subcategorization
- Medical information (requirements, contraindications, side effects)
- Success rates and availability settings

## Features

### Dynamic Pricing
Each clinic has a different pricing tier that affects all treatment prices:
- Budget clinics offer 30% discounts
- Premium clinics use base pricing
- Luxury clinics add 20% premium
- Exclusive clinics add 40% premium

### Comprehensive Treatment Data
Each treatment includes:
- Duration and preparation time
- Recovery time estimates
- Medical requirements and contraindications
- Side effects information
- Success rates
- Equipment and certification requirements
- Age restrictions
- Insurance coverage information

### Realistic Clinic Data
Each clinic includes:
- Complete contact information
- Operating hours
- Social media presence
- Service specialties
- Language support
- Verification status
- Ratings and review counts

## Verification

The verification script provides:
- Clinic count and details
- Treatment count per clinic
- Sample pricing display
- Treatment category statistics
- Data integrity checks

## Maintenance

To update or modify the data:
1. Edit the `treatments` array in `seed-clinics.js`
2. Update the `basePrices` object with new pricing
3. Modify clinic data in the `clinics` array
4. Run the seed script to update the database

## Notes

- All prices are stored in cents to avoid floating-point precision issues
- Currency is set to EUR for all treatments
- Clinic locations are in Istanbul, Turkey
- All clinics are set to ACTIVE status
- Verification dates are set to current timestamp
- Operating hours follow Turkish business practices

