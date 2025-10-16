const https = require('https');

class GooglePlacesService {
    constructor() {
        this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    }

    // Make HTTP request to Google Places API
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({ status: res.statusCode, data: jsonData });
                    } catch (error) {
                        resolve({ status: res.statusCode, data: data });
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    // Extract place ID from Google Maps URL
    extractPlaceIdFromUrl(url) {
        try {
            // Handle different Google Maps URL formats
            const patterns = [
                /\/place\/([^\/]+)\/data=!4m2!3m1!1s([^:]+):([^?]+)/,
                /\/place\/([^\/]+)\/data=!4m2!3m1!1s([^?]+)/,
                /place_id=([^&]+)/,
                /\/place\/([^\/]+)\/@/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    if (pattern === patterns[0]) {
                        // Format: place_id from data parameter
                        return match[2] + ':' + match[3];
                    } else if (pattern === patterns[1]) {
                        // Format: place_id from data parameter (simplified)
                        return match[2];
                    } else if (pattern === patterns[2]) {
                        // Format: direct place_id parameter
                        return match[1];
                    } else if (pattern === patterns[3]) {
                        // Format: place name from URL
                        return match[1];
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting place ID:', error);
            return null;
        }
    }

    // Search for place using text search
    async searchPlaceByName(placeName) {
        try {
            console.log(`🔍 Searching for place: ${placeName}`);
            
            const searchQuery = encodeURIComponent(placeName);
            const url = `${this.baseUrl}/textsearch/json?query=${searchQuery}&key=${this.apiKey}`;
            
            const response = await this.makeRequest(url);
            
            if (response.status === 200 && response.data.status === 'OK') {
                if (response.data.results.length > 0) {
                    const place = response.data.results[0];
                    console.log(`✅ Found place: ${place.name} (ID: ${place.place_id})`);
                    return {
                        placeId: place.place_id,
                        name: place.name,
                        address: place.formatted_address,
                        rating: place.rating,
                        userRatingsTotal: place.user_ratings_total
                    };
                } else {
                    console.log('❌ No places found');
                    return null;
                }
            } else {
                console.log('❌ API Error:', response.data.error_message);
                return null;
            }
        } catch (error) {
            console.error('❌ Error searching for place:', error);
            return null;
        }
    }

    // Get detailed place information including reviews
    async getPlaceDetails(placeId) {
        try {
            console.log(`🔍 Fetching details for place ID: ${placeId}`);
            
            const fields = 'name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number,website,opening_hours,types';
            const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
            
            const response = await this.makeRequest(url);
            
            if (response.status === 200 && response.data.status === 'OK') {
                const result = response.data.result;
                
                // Process reviews
                const processedReviews = result.reviews ? result.reviews.map(review => ({
                    authorName: review.author_name,
                    authorUrl: review.author_url,
                    rating: review.rating,
                    text: review.text,
                    time: review.time,
                    date: new Date(review.time * 1000).toISOString(),
                    relativeTime: review.relative_time_description
                })) : [];

                // Calculate review statistics
                const reviewStats = this.calculateReviewStats(processedReviews);

                const placeDetails = {
                    placeId: placeId,
                    name: result.name,
                    address: result.formatted_address,
                    phone: result.formatted_phone_number,
                    website: result.website,
                    rating: result.rating,
                    userRatingsTotal: result.user_ratings_total,
                    openingHours: result.opening_hours ? result.opening_hours.weekday_text : null,
                    types: result.types,
                    reviews: processedReviews,
                    reviewStats: reviewStats
                };

                console.log(`✅ Retrieved ${processedReviews.length} reviews for ${result.name}`);
                return placeDetails;
            } else {
                console.log('❌ API Error:', response.data.error_message);
                return null;
            }
        } catch (error) {
            console.error('❌ Error fetching place details:', error);
            return null;
        }
    }

    // Calculate review statistics
    calculateReviewStats(reviews) {
        if (!reviews || reviews.length === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                recentReviews: 0
            };
        }

        const ratings = reviews.map(r => r.rating);
        const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach(rating => {
            if (ratingDistribution.hasOwnProperty(rating)) {
                ratingDistribution[rating]++;
            }
        });

        // Count recent reviews (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentReviews = reviews.filter(review => 
            new Date(review.time * 1000) > thirtyDaysAgo
        ).length;

        return {
            totalReviews: reviews.length,
            averageRating: parseFloat(averageRating.toFixed(1)),
            ratingDistribution,
            recentReviews
        };
    }

    // Main method to fetch clinic reviews from Google Maps URL
    async fetchClinicReviews(googleMapsUrl, clinicName = null) {
        try {
            console.log(`🏥 Fetching clinic reviews from: ${googleMapsUrl}`);
            
            if (!this.apiKey) {
                throw new Error('Google Places API key not configured');
            }

            // Try to extract place ID from URL first
            let placeId = this.extractPlaceIdFromUrl(googleMapsUrl);
            let placeDetails = null;

            if (placeId) {
                console.log(`📍 Extracted Place ID: ${placeId}`);
                placeDetails = await this.getPlaceDetails(placeId);
            }

            // If URL parsing failed or no details found, try text search
            if (!placeDetails && clinicName) {
                console.log('🔄 Trying text search method...');
                const searchResult = await this.searchPlaceByName(clinicName);
                if (searchResult) {
                    placeDetails = await this.getPlaceDetails(searchResult.placeId);
                }
            }

            if (placeDetails) {
                console.log(`✅ Successfully fetched reviews for ${placeDetails.name}`);
                return {
                    success: true,
                    data: placeDetails
                };
            } else {
                console.log('❌ Could not fetch clinic reviews');
                return {
                    success: false,
                    error: 'Could not find clinic information from Google Maps'
                };
            }
        } catch (error) {
            console.error('❌ Error fetching clinic reviews:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new GooglePlacesService();