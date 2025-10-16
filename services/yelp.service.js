const axios = require('axios');

class YelpService {
  constructor() {
    this.apiKey = process.env.YELP_API_KEY;
    this.baseUrl = 'https://api.yelp.com/v3';
  }

  async searchClinics(term, location, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/businesses/search`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          term: `${term} dental clinic`,
          location: location,
          categories: 'dentists',
          limit: limit,
          sort_by: 'rating'
        }
      });

      return this.transformResults(response.data.businesses);
    } catch (error) {
      console.error('Yelp API error:', error);
      throw new Error('Failed to fetch data from Yelp');
    }
  }

  async getClinicDetails(businessId) {
    try {
      const response = await axios.get(`${this.baseUrl}/businesses/${businessId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return this.transformDetailResult(response.data);
    } catch (error) {
      console.error('Yelp Details API error:', error);
      throw new Error('Failed to fetch clinic details from Yelp');
    }
  }

  transformResults(businesses) {
    return businesses.map(business => ({
      id: business.id,
      name: business.name,
      address: business.location?.address1 || 'Unknown Address',
      city: business.location?.city || 'Unknown City',
      state: business.location?.state || null,
      country: business.location?.country || 'Unknown Country',
      postalCode: business.location?.zip_code || null,
      latitude: business.coordinates?.latitude,
      longitude: business.coordinates?.longitude,
      rating: business.rating || 0,
      reviewCount: business.review_count || 0,
      phone: business.phone || null,
      website: business.url || null,
      thirdPartySource: 'yelp'
    }));
  }

  transformDetailResult(business) {
    return {
      id: business.id,
      name: business.name,
      description: business.categories?.map(cat => cat.title).join(', ') || null,
      email: null, // Yelp doesn't provide email
      phone: business.phone || null,
      website: business.url || null,
      address: business.location?.address1 || 'Unknown Address',
      city: business.location?.city || 'Unknown City',
      state: business.location?.state || null,
      country: business.location?.country || 'Unknown Country',
      postalCode: business.location?.zip_code || null,
      latitude: business.coordinates?.latitude,
      longitude: business.coordinates?.longitude,
      clinicType: 'DENTAL',
      services: this.extractServices(business.categories || []),
      specialties: this.extractSpecialties(business.categories || []),
      languages: [], // Would need additional processing
      operatingHours: this.transformOperatingHours(business.hours),
      socialMedia: {
        yelp: business.url
      },
      rating: business.rating || 0,
      reviewCount: business.review_count || 0,
      thirdPartyData: business
    };
  }

  extractServices(categories) {
    return categories.map(cat => cat.title).filter(title => 
      title.toLowerCase().includes('dental') || 
      title.toLowerCase().includes('health') ||
      title.toLowerCase().includes('medical')
    );
  }

  extractSpecialties(categories) {
    return categories
      .filter(cat => cat.title.toLowerCase().includes('dental'))
      .map(cat => cat.title);
  }

  transformOperatingHours(hours) {
    if (!hours || !Array.isArray(hours)) {
      return null;
    }

    const hoursObj = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    hours.forEach(dayHours => {
      const day = dayHours.day;
      if (day >= 0 && day <= 6) {
        const dayName = days[day];
        if (dayHours.is_overnight) {
          hoursObj[dayName] = '24 hours';
        } else if (dayHours.start && dayHours.end) {
          const start = this.formatTime(dayHours.start);
          const end = this.formatTime(dayHours.end);
          hoursObj[dayName] = `${start} - ${end}`;
        } else {
          hoursObj[dayName] = 'closed';
        }
      }
    });

    return hoursObj;
  }

  formatTime(timeString) {
    const time = parseInt(timeString);
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
}

module.exports = new YelpService();
