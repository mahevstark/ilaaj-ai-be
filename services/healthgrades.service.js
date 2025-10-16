const axios = require('axios');

class HealthgradesService {
  constructor() {
    this.apiKey = process.env.HEALTHGRADES_API_KEY;
    this.baseUrl = 'https://api.healthgrades.com/v1';
  }

  async searchClinics(query, location, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/providers/search`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          q: `${query} dental`,
          location: location,
          specialty: 'dentist',
          limit: limit
        }
      });

      return this.transformResults(response.data.providers || []);
    } catch (error) {
      console.error('Healthgrades API error:', error);
      throw new Error('Failed to fetch data from Healthgrades');
    }
  }

  async getClinicDetails(providerId) {
    try {
      const response = await axios.get(`${this.baseUrl}/providers/${providerId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return this.transformDetailResult(response.data);
    } catch (error) {
      console.error('Healthgrades Details API error:', error);
      throw new Error('Failed to fetch clinic details from Healthgrades');
    }
  }

  transformResults(providers) {
    return providers.map(provider => ({
      id: provider.id,
      name: provider.name || 'Unknown Clinic',
      address: provider.address?.street || 'Unknown Address',
      city: provider.address?.city || 'Unknown City',
      state: provider.address?.state || null,
      country: provider.address?.country || 'Unknown Country',
      postalCode: provider.address?.zip || null,
      latitude: provider.coordinates?.latitude,
      longitude: provider.coordinates?.longitude,
      rating: provider.rating || 0,
      reviewCount: provider.review_count || 0,
      phone: provider.phone || null,
      website: provider.website || null,
      specialties: provider.specialties || [],
      thirdPartySource: 'healthgrades'
    }));
  }

  transformDetailResult(provider) {
    return {
      id: provider.id,
      name: provider.name || 'Unknown Clinic',
      description: provider.bio || provider.specialties?.join(', ') || null,
      email: provider.email || null,
      phone: provider.phone || null,
      website: provider.website || null,
      address: provider.address?.street || 'Unknown Address',
      city: provider.address?.city || 'Unknown City',
      state: provider.address?.state || null,
      country: provider.address?.country || 'Unknown Country',
      postalCode: provider.address?.zip || null,
      latitude: provider.coordinates?.latitude,
      longitude: provider.coordinates?.longitude,
      clinicType: 'DENTAL',
      services: this.extractServices(provider.specialties || []),
      specialties: provider.specialties || [],
      languages: provider.languages || [],
      operatingHours: this.transformOperatingHours(provider.hours),
      socialMedia: {
        healthgrades: provider.profile_url
      },
      rating: provider.rating || 0,
      reviewCount: provider.review_count || 0,
      thirdPartyData: provider
    };
  }

  extractServices(specialties) {
    return specialties.filter(specialty => 
      specialty.toLowerCase().includes('dental') || 
      specialty.toLowerCase().includes('oral') ||
      specialty.toLowerCase().includes('tooth')
    );
  }

  transformOperatingHours(hours) {
    if (!hours) {
      return null;
    }

    const hoursObj = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    if (Array.isArray(hours)) {
      hours.forEach(dayHours => {
        const day = dayHours.day?.toLowerCase();
        if (days.includes(day)) {
          if (dayHours.is_closed) {
            hoursObj[day] = 'closed';
          } else if (dayHours.open && dayHours.close) {
            hoursObj[day] = `${dayHours.open} - ${dayHours.close}`;
          }
        }
      });
    }

    return Object.keys(hoursObj).length > 0 ? hoursObj : null;
  }
}

module.exports = new HealthgradesService();
