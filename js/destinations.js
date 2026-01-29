/**
 * Family Trip Finder - Destination API Service
 *
 * Uses OpenTripMap API (free, 5000 requests/day) to fetch real destinations.
 * https://opentripmap.io/product
 */

// =============================================================================
// OpenTripMap API Configuration
// =============================================================================

const OPENTRIPMAP_API = {
    baseUrl: 'https://api.opentripmap.com/0.1/en/places',
    // Free API key - get your own at https://opentripmap.io/product for production
    apiKey: '5ae2e3f221c38a28845f05b6aed6b2a7c0805e707f96d53a18f2a82c'
};

// =============================================================================
// Category Mapping - OpenTripMap categories to our app categories
// =============================================================================

const CATEGORY_MAPPING = {
    // Our category -> OpenTripMap kinds
    theme_park: {
        kinds: 'amusement_parks,theme_parks,water_parks',
        label: 'Theme Park',
        icon: '🎢',
        color: '#f59e0b',
        defaultEmoji: '🎢'
    },
    beach: {
        kinds: 'beaches,natural_springs,swimming_pools',
        label: 'Beach',
        icon: '🏖️',
        color: '#06b6d4',
        defaultEmoji: '🏖️'
    },
    nature: {
        kinds: 'national_parks,nature_reserves,natural_monuments,gardens_and_parks,hiking_trails,waterfalls,view_points',
        label: 'Nature',
        icon: '🌲',
        color: '#10b981',
        defaultEmoji: '🌲'
    },
    museum: {
        kinds: 'museums,science_museums,art_galleries,planetariums,children_museums',
        label: 'Museum',
        icon: '🏛️',
        color: '#8b5cf6',
        defaultEmoji: '🏛️'
    },
    zoo: {
        kinds: 'zoos,aquariums,farms,aviaries',
        label: 'Zoo',
        icon: '🦁',
        color: '#f97316',
        defaultEmoji: '🦁'
    },
    historic: {
        kinds: 'historic,monuments_and_memorials,castles,fortifications,archaeological_sites,lighthouses',
        label: 'Historic Site',
        icon: '🏰',
        color: '#6366f1',
        defaultEmoji: '🏰'
    },
    hotel: {
        kinds: 'accomodations,hotels,resorts,guest_houses,hostels',
        label: 'Family Hotel',
        icon: '🏨',
        color: '#ec4899',
        defaultEmoji: '🏨',
        kidFriendly: true
    },
    camping: {
        kinds: 'campsites,camping,caravan_site,alpine_hut',
        label: 'Camping',
        icon: '🏕️',
        color: '#84cc16',
        defaultEmoji: '🏕️',
        kidFriendly: true
    }
};

// Reverse mapping: OpenTripMap kind -> our category
const KIND_TO_CATEGORY = {};
Object.entries(CATEGORY_MAPPING).forEach(([category, config]) => {
    config.kinds.split(',').forEach(kind => {
        KIND_TO_CATEGORY[kind] = category;
    });
});

// =============================================================================
// Destination Type Metadata (for UI)
// =============================================================================

const DESTINATION_TYPES = Object.fromEntries(
    Object.entries(CATEGORY_MAPPING).map(([key, val]) => [
        key,
        { label: val.label, icon: val.icon, color: val.color }
    ])
);

// =============================================================================
// Emoji mapping based on OpenTripMap kinds
// =============================================================================

const KIND_EMOJIS = {
    // Theme parks
    'amusement_parks': '🎢',
    'theme_parks': '🎠',
    'water_parks': '🌊',
    // Beaches
    'beaches': '🏖️',
    'natural_springs': '💧',
    'swimming_pools': '🏊',
    // Nature
    'national_parks': '🏞️',
    'nature_reserves': '🌿',
    'natural_monuments': '🗻',
    'gardens_and_parks': '🌳',
    'hiking_trails': '🥾',
    'waterfalls': '💦',
    'view_points': '🌄',
    // Museums
    'museums': '🏛️',
    'science_museums': '🔬',
    'art_galleries': '🎨',
    'planetariums': '🔭',
    'children_museums': '🧒',
    // Zoos
    'zoos': '🦁',
    'aquariums': '🐠',
    'farms': '🐄',
    'aviaries': '🦜',
    // Historic
    'historic': '🏰',
    'monuments_and_memorials': '🗽',
    'castles': '🏰',
    'fortifications': '🏯',
    'archaeological_sites': '🏺',
    'lighthouses': '🗼',
    // Accommodations
    'accomodations': '🏨',
    'hotels': '🏨',
    'resorts': '🌴',
    'guest_houses': '🏠',
    'hostels': '🛏️',
    'campsites': '🏕️',
    'camping': '⛺',
    'caravan_site': '🚐',
    'alpine_hut': '🏔️'
};

// =============================================================================
// Destination API Service
// =============================================================================

const DestinationAPI = {
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes

    /**
     * Fetch destinations within a radius from a center point
     * @param {Object} center - { lat, lng }
     * @param {number} radiusKm - Search radius in kilometers
     * @param {Set} categories - Set of category names to include
     * @returns {Promise<Array>} Array of destination objects
     */
    async fetchDestinations(center, radiusKm, categories) {
        const allDestinations = [];
        const fetchPromises = [];

        // Fetch each category in parallel
        for (const category of categories) {
            const config = CATEGORY_MAPPING[category];
            if (!config) continue;

            fetchPromises.push(
                this.fetchByCategory(center, radiusKm, category, config)
                    .then(destinations => {
                        allDestinations.push(...destinations);
                    })
                    .catch(err => {
                        console.warn(`Failed to fetch ${category}:`, err);
                    })
            );
        }

        await Promise.all(fetchPromises);

        // Remove duplicates based on xid
        const uniqueMap = new Map();
        allDestinations.forEach(dest => {
            if (!uniqueMap.has(dest.id)) {
                uniqueMap.set(dest.id, dest);
            }
        });

        return Array.from(uniqueMap.values());
    },

    /**
     * Fetch destinations for a specific category
     */
    async fetchByCategory(center, radiusKm, category, config) {
        const cacheKey = `${center.lat},${center.lng}-${radiusKm}-${category}`;

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        // Build API URL - radius endpoint
        const url = new URL(`${OPENTRIPMAP_API.baseUrl}/radius`);
        url.searchParams.set('radius', Math.min(radiusKm * 1000, 50000)); // Max 50km per request
        url.searchParams.set('lon', center.lng);
        url.searchParams.set('lat', center.lat);
        url.searchParams.set('kinds', config.kinds);
        url.searchParams.set('rate', '2'); // Only get places with ratings 2+ (more interesting)
        url.searchParams.set('limit', '50'); // Limit per category
        url.searchParams.set('apikey', OPENTRIPMAP_API.apiKey);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Transform to our format
            const destinations = await this.transformResults(data.features || [], category, config);

            // Cache results
            this.cache.set(cacheKey, { data: destinations, timestamp: Date.now() });

            return destinations;
        } catch (error) {
            console.error(`Error fetching ${category}:`, error);
            return [];
        }
    },

    /**
     * Transform OpenTripMap results to our destination format
     */
    async transformResults(features, category, config) {
        const destinations = [];

        for (const feature of features) {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            // Skip places without names
            if (!props.name) continue;

            // Determine emoji based on kinds
            let emoji = config.defaultEmoji;
            if (props.kinds) {
                const kinds = props.kinds.split(',');
                for (const kind of kinds) {
                    if (KIND_EMOJIS[kind]) {
                        emoji = KIND_EMOJIS[kind];
                        break;
                    }
                }
            }

            destinations.push({
                id: props.xid,
                name: props.name,
                type: category,
                lat: coords[1],
                lng: coords[0],
                city: '', // Will be populated from detail API if needed
                description: '', // Will be populated from detail API
                kidFriendlyRating: this.estimateRating(props.rate),
                ageRange: 'All ages',
                amenities: [],
                tips: '',
                imageEmoji: emoji,
                distance: props.dist,
                wikidata: props.wikidata,
                xid: props.xid // Keep for detail fetching
            });
        }

        return destinations;
    },

    /**
     * Fetch detailed info for a destination (called on demand)
     */
    async fetchDestinationDetails(xid) {
        const cacheKey = `detail-${xid}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const url = `${OPENTRIPMAP_API.baseUrl}/xid/${xid}?apikey=${OPENTRIPMAP_API.apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Detail fetch failed');

            const data = await response.json();

            const details = {
                description: data.wikipedia_extracts?.text || data.info?.descr || '',
                city: data.address?.city || data.address?.town || data.address?.county || '',
                state: data.address?.state || '',
                country: data.address?.country || '',
                image: data.preview?.source || null,
                url: data.url || data.wikipedia || null
            };

            this.cache.set(cacheKey, { data: details, timestamp: Date.now() });
            return details;
        } catch (error) {
            console.error('Error fetching details:', error);
            return null;
        }
    },

    /**
     * Estimate kid-friendly rating from OpenTripMap rate
     */
    estimateRating(rate) {
        if (!rate) return 3;
        // OpenTripMap rate is 1-7, we want 1-5
        return Math.min(5, Math.max(1, Math.round((rate / 7) * 5)));
    },

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
};

// =============================================================================
// Fallback: Sample destinations for when API fails or for offline use
// =============================================================================

const FALLBACK_DESTINATIONS = [
    {
        id: 'fallback-001',
        name: 'Central Park',
        type: 'nature',
        lat: 40.7829,
        lng: -73.9654,
        city: 'New York, NY',
        description: 'Iconic urban park with playgrounds, zoo, and boat rentals.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['playground', 'restrooms', 'food_vendors'],
        tips: 'Visit the carousel and the Central Park Zoo!',
        imageEmoji: '🌳'
    },
    {
        id: 'fallback-002',
        name: 'American Museum of Natural History',
        type: 'museum',
        lat: 40.7813,
        lng: -73.9740,
        city: 'New York, NY',
        description: 'World-famous museum with dinosaurs and space exhibits.',
        kidFriendlyRating: 5,
        ageRange: '4+',
        amenities: ['cafe', 'gift_shop', 'planetarium'],
        tips: 'Start with the dinosaurs on the 4th floor!',
        imageEmoji: '🦕'
    },
    {
        id: 'fallback-003',
        name: 'Bronx Zoo',
        type: 'zoo',
        lat: 40.8506,
        lng: -73.8769,
        city: 'Bronx, NY',
        description: 'One of the largest urban zoos in the world.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['stroller_rental', 'restaurants', 'parking'],
        tips: 'Wednesdays are pay-what-you-wish!',
        imageEmoji: '🦁'
    }
];

// =============================================================================
// Legacy support - keep DESTINATIONS array populated for initial load
// =============================================================================

let DESTINATIONS = [...FALLBACK_DESTINATIONS];

// =============================================================================
// Exports
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DestinationAPI,
        DESTINATION_TYPES,
        CATEGORY_MAPPING,
        FALLBACK_DESTINATIONS,
        DESTINATIONS
    };
}
