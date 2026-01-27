/**
 * Family Trip Finder - Main Application
 *
 * A travel app that shows destinations within a specified driving time
 * using Leaflet maps and isochrone calculations.
 */

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
    // Default map center (New York City area)
    defaultCenter: [40.7128, -74.0060],
    defaultZoom: 10,

    // OpenRouteService API (free tier: 2000 requests/day)
    // Get your free API key at: https://openrouteservice.org/dev/#/signup
    // For demo purposes, we'll use a fallback circle-based approximation
    orsApiKey: 'YOUR_ORS_API_KEY_HERE',

    // Average driving speed for fallback calculations (mph)
    averageDrivingSpeed: 45,

    // Map tile provider (free OpenStreetMap)
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

    // Isochrone styling
    isochroneStyle: {
        color: '#6366f1',
        weight: 3,
        opacity: 0.8,
        fillColor: '#6366f1',
        fillOpacity: 0.15
    }
};

// =============================================================================
// Application State
// =============================================================================

const state = {
    map: null,
    userLocation: null,
    userMarker: null,
    isochroneLayer: null,
    isochroneFeature: null, // Store for filtering
    destinationMarkers: [],
    currentDestinations: [], // Store fetched destinations
    selectedDestination: null,
    driveTimeMinutes: 120, // Default 2 hours
    activeFilters: new Set(['theme_park', 'beach', 'nature', 'museum', 'zoo', 'historic']),
    isLoading: false
};

// =============================================================================
// Map Initialization
// =============================================================================

function initializeMap() {
    // Create map instance
    state.map = L.map('map', {
        center: CONFIG.defaultCenter,
        zoom: CONFIG.defaultZoom,
        zoomControl: true
    });

    // Add tile layer
    L.tileLayer(CONFIG.tileUrl, {
        attribution: CONFIG.tileAttribution,
        maxZoom: 19
    }).addTo(state.map);

    // Add zoom control to bottom left (for mobile friendliness)
    state.map.zoomControl.setPosition('bottomleft');

    console.log('Map initialized successfully');
}

// =============================================================================
// Geolocation
// =============================================================================

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        updateLocationStatus('Detecting your location...', 'loading');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve({ lat: latitude, lng: longitude });
            },
            (error) => {
                let message;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        break;
                    default:
                        message = 'An unknown error occurred.';
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // Cache for 5 minutes
            }
        );
    });
}

async function geocodeAddress(address) {
    updateLocationStatus('Searching for address...', 'loading');

    try {
        // Using Nominatim (OpenStreetMap) for free geocoding
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
            {
                headers: {
                    'User-Agent': 'FamilyTripFinder/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

        const data = await response.json();

        if (data.length === 0) {
            throw new Error('Address not found. Please try a different search.');
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

// =============================================================================
// User Location Management
// =============================================================================

function setUserLocation(location, displayName = 'Your Location') {
    state.userLocation = location;

    // Remove existing marker
    if (state.userMarker) {
        state.map.removeLayer(state.userMarker);
    }

    // Create custom user marker
    const userIcon = L.divIcon({
        className: 'custom-marker user-marker',
        html: '<div class="marker-pin"><span>📍</span></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });

    state.userMarker = L.marker([location.lat, location.lng], { icon: userIcon })
        .addTo(state.map)
        .bindPopup(`<div class="popup-content"><h3>${displayName}</h3><p>Your starting point</p></div>`);

    // Center map on user location
    state.map.setView([location.lat, location.lng], 10);

    updateLocationStatus(`Location set: ${displayName.split(',')[0]}`, 'success');
}

function updateLocationStatus(message, type = '') {
    const statusEl = document.getElementById('location-status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
}

// =============================================================================
// Isochrone (Drive Time Area) Calculation
// =============================================================================

async function calculateIsochrone(center, timeMinutes) {
    showLoading(true);

    try {
        // Try OpenRouteService API first
        if (CONFIG.orsApiKey && CONFIG.orsApiKey !== 'YOUR_ORS_API_KEY_HERE') {
            return await fetchORSIsochrone(center, timeMinutes);
        }

        // Fallback to circle approximation
        console.log('Using circle approximation for isochrone');
        return createApproximateIsochrone(center, timeMinutes);
    } catch (error) {
        console.error('Isochrone calculation error:', error);
        // Always fallback to circle on error
        return createApproximateIsochrone(center, timeMinutes);
    } finally {
        showLoading(false);
    }
}

async function fetchORSIsochrone(center, timeMinutes) {
    const url = 'https://api.openrouteservice.org/v2/isochrones/driving-car';

    const body = {
        locations: [[center.lng, center.lat]],
        range: [timeMinutes * 60], // Convert to seconds
        range_type: 'time'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': CONFIG.orsApiKey
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error('OpenRouteService API error');
    }

    const data = await response.json();
    return data.features[0];
}

function createApproximateIsochrone(center, timeMinutes) {
    // Calculate approximate radius based on average driving speed
    // This is a simplified approximation - real isochrones account for roads
    const timeHours = timeMinutes / 60;
    const radiusMiles = CONFIG.averageDrivingSpeed * timeHours;
    const radiusKm = radiusMiles * 1.60934;

    // Create a polygon that approximates an irregular isochrone
    // by varying the radius slightly to look more realistic
    const points = [];
    const numPoints = 64;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;

        // Add some variation to make it look more realistic (not a perfect circle)
        const variation = 0.85 + Math.random() * 0.3;
        const adjustedRadius = radiusKm * variation;

        // Convert to lat/lng offset (rough approximation)
        const latOffset = (adjustedRadius / 111) * Math.cos(angle);
        const lngOffset = (adjustedRadius / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);

        points.push([center.lng + lngOffset, center.lat + latOffset]);
    }

    // Close the polygon
    points.push(points[0]);

    // Return GeoJSON feature
    return {
        type: 'Feature',
        properties: {
            value: timeMinutes * 60,
            center: [center.lng, center.lat]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [points]
        }
    };
}

function displayIsochrone(isochroneFeature) {
    // Remove existing isochrone
    if (state.isochroneLayer) {
        state.map.removeLayer(state.isochroneLayer);
    }

    // Add new isochrone layer
    state.isochroneLayer = L.geoJSON(isochroneFeature, {
        style: CONFIG.isochroneStyle
    }).addTo(state.map);

    // Fit map to isochrone bounds
    state.map.fitBounds(state.isochroneLayer.getBounds(), {
        padding: [50, 50]
    });
}

// =============================================================================
// Destination Management
// =============================================================================

function isPointInIsochrone(lat, lng, isochroneFeature) {
    if (!isochroneFeature) return false;

    // Simple point-in-polygon test
    const point = [lng, lat];
    const polygon = isochroneFeature.geometry.coordinates[0];

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        if (((yi > point[1]) !== (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

function calculateDriveTime(from, to) {
    // Calculate straight-line distance
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Estimate drive time (assuming average speed with road factor)
    const distanceMiles = distanceKm * 0.621371;
    const roadFactor = 1.3; // Roads aren't straight
    const timeHours = (distanceMiles * roadFactor) / CONFIG.averageDrivingSpeed;

    return Math.round(timeHours * 60); // Return minutes
}

function displayDestinations(isochroneFeature, destinations = []) {
    // Clear existing markers
    state.destinationMarkers.forEach(marker => state.map.removeLayer(marker));
    state.destinationMarkers = [];

    // Filter by active categories
    const filteredDestinations = destinations.filter(dest => state.activeFilters.has(dest.type));
    const reachableDestinations = [];

    filteredDestinations.forEach(dest => {
        const isReachable = isPointInIsochrone(dest.lat, dest.lng, isochroneFeature);

        if (isReachable) {
            const driveTime = calculateDriveTime(state.userLocation, { lat: dest.lat, lng: dest.lng });
            reachableDestinations.push({ ...dest, driveTime });
        }
    });

    // Sort by drive time
    reachableDestinations.sort((a, b) => a.driveTime - b.driveTime);

    // Add markers for reachable destinations
    reachableDestinations.forEach(dest => {
        const typeInfo = DESTINATION_TYPES[dest.type];
        const icon = L.divIcon({
            className: 'custom-marker destination-marker',
            html: `<div class="marker-pin" style="border-color: ${typeInfo.color}"><span>${dest.imageEmoji}</span></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });

        const marker = L.marker([dest.lat, dest.lng], { icon })
            .addTo(state.map)
            .bindPopup(createPopupContent(dest));

        marker.destinationId = dest.id;

        marker.on('click', () => {
            highlightDestination(dest.id);
        });

        state.destinationMarkers.push(marker);
    });

    // Update results list
    updateResultsList(reachableDestinations);
}

function createPopupContent(dest) {
    const typeInfo = DESTINATION_TYPES[dest.type];
    const driveTimeStr = dest.driveTime ? formatDriveTime(dest.driveTime) : 'Unknown';
    const stars = '⭐'.repeat(Math.min(dest.kidFriendlyRating || 3, 5));
    const cityDisplay = dest.city || 'Location';
    const description = dest.description || 'Click to learn more about this destination.';

    return `
        <div class="popup-content" data-xid="${dest.xid || ''}">
            <h3>${dest.imageEmoji} ${dest.name}</h3>
            <p>${cityDisplay}</p>
            <p class="drive-time">🚗 ${driveTimeStr} drive</p>
            <p>${stars} (Ages ${dest.ageRange || 'All ages'})</p>
            <p style="font-size: 0.75rem; margin-top: 0.5rem;">${description}</p>
            ${dest.tips ? `<p style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem;">💡 ${dest.tips}</p>` : ''}
        </div>
    `;
}

function formatDriveTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
}

function updateResultsList(destinations) {
    const listEl = document.getElementById('results-list');
    const countEl = document.getElementById('results-count');

    countEl.textContent = `(${destinations.length})`;

    if (destinations.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No destinations found within your drive time. Try increasing the time or changing filters.</p>';
        return;
    }

    listEl.innerHTML = destinations.map(dest => {
        const typeInfo = DESTINATION_TYPES[dest.type];
        const driveTimeStr = formatDriveTime(dest.driveTime);
        const stars = '⭐'.repeat(Math.min(dest.kidFriendlyRating, 5));

        return `
            <div class="result-card" data-id="${dest.id}">
                <div class="result-card-header">
                    <span class="result-card-icon">${dest.imageEmoji}</span>
                    <div class="result-card-info">
                        <div class="result-card-title">${dest.name}</div>
                        <div class="result-card-location">${dest.city}</div>
                    </div>
                </div>
                <div class="result-card-meta">
                    <span class="result-card-drive-time">🚗 ${driveTimeStr}</span>
                    <span class="result-card-rating">${stars}</span>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    listEl.querySelectorAll('.result-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            highlightDestination(id);
            panToDestination(id);
        });
    });
}

function highlightDestination(id) {
    // Update state
    state.selectedDestination = id;

    // Update result cards
    document.querySelectorAll('.result-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === id);
    });

    // Open popup on marker
    const marker = state.destinationMarkers.find(m => m.destinationId === id);
    if (marker) {
        marker.openPopup();
    }
}

function panToDestination(id) {
    const dest = state.currentDestinations.find(d => d.id === id);
    if (dest) {
        state.map.setView([dest.lat, dest.lng], 12, {
            animate: true,
            duration: 0.5
        });
    }
}

// =============================================================================
// Search Functionality
// =============================================================================

async function performSearch() {
    if (!state.userLocation) {
        updateLocationStatus('Please set your starting location first', 'error');
        return;
    }

    if (state.isLoading) return;
    state.isLoading = true;
    showLoading(true);

    try {
        // Calculate isochrone
        const isochroneFeature = await calculateIsochrone(
            state.userLocation,
            state.driveTimeMinutes
        );

        // Store for later filtering
        state.isochroneFeature = isochroneFeature;

        // Display isochrone on map
        displayIsochrone(isochroneFeature);

        // Calculate search radius in km (approximate from drive time)
        const timeHours = state.driveTimeMinutes / 60;
        const radiusKm = CONFIG.averageDrivingSpeed * timeHours * 1.60934;

        // Fetch destinations from API
        console.log(`Fetching destinations within ${radiusKm.toFixed(0)}km...`);
        const destinations = await DestinationAPI.fetchDestinations(
            state.userLocation,
            Math.min(radiusKm, 150), // Cap at 150km for API limits
            state.activeFilters
        );

        console.log(`Found ${destinations.length} destinations from API`);

        // Store fetched destinations
        state.currentDestinations = destinations;

        // Display destinations within isochrone
        displayDestinations(isochroneFeature, destinations);

    } catch (error) {
        console.error('Search error:', error);
        updateLocationStatus('Search failed. Please try again.', 'error');

        // Try with fallback destinations
        if (typeof FALLBACK_DESTINATIONS !== 'undefined') {
            console.log('Using fallback destinations');
            state.currentDestinations = FALLBACK_DESTINATIONS;
            displayDestinations(state.isochroneFeature, FALLBACK_DESTINATIONS);
        }
    } finally {
        state.isLoading = false;
        showLoading(false);
    }
}

// =============================================================================
// UI Helpers
// =============================================================================

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.toggle('hidden', !show);
}

function updateTimeDisplay(value) {
    const displayEl = document.getElementById('time-value');
    const hours = parseFloat(value);

    if (hours < 1) {
        displayEl.textContent = `${Math.round(hours * 60)}`;
        displayEl.nextElementSibling.textContent = 'minutes';
    } else {
        displayEl.textContent = hours % 1 === 0 ? hours : hours.toFixed(1);
        displayEl.nextElementSibling.textContent = hours === 1 ? 'hour' : 'hours';
    }

    state.driveTimeMinutes = Math.round(hours * 60);
}

// =============================================================================
// Event Listeners
// =============================================================================

function setupEventListeners() {
    // Use current location button
    document.getElementById('use-current-location').addEventListener('click', async () => {
        try {
            const location = await getCurrentLocation();
            setUserLocation(location);
        } catch (error) {
            updateLocationStatus(error.message, 'error');
        }
    });

    // Address search
    const addressInput = document.getElementById('address-input');
    const searchButton = document.getElementById('search-address');

    const searchAddress = async () => {
        const address = addressInput.value.trim();
        if (!address) {
            updateLocationStatus('Please enter an address', 'error');
            return;
        }

        try {
            const result = await geocodeAddress(address);
            setUserLocation(
                { lat: result.lat, lng: result.lng },
                result.displayName
            );
        } catch (error) {
            updateLocationStatus(error.message, 'error');
        }
    };

    searchButton.addEventListener('click', searchAddress);
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchAddress();
        }
    });

    // Time slider
    const timeSlider = document.getElementById('time-slider');
    timeSlider.addEventListener('input', (e) => {
        updateTimeDisplay(e.target.value);
    });

    // Search destinations button
    document.getElementById('search-destinations').addEventListener('click', performSearch);

    // Filter checkboxes
    document.querySelectorAll('.filter-chips input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const type = e.target.value;
            if (e.target.checked) {
                state.activeFilters.add(type);
            } else {
                state.activeFilters.delete(type);
            }

            // Re-filter existing destinations (no need to re-fetch)
            if (state.isochroneFeature && state.currentDestinations.length > 0) {
                displayDestinations(state.isochroneFeature, state.currentDestinations);
            } else if (state.isochroneLayer) {
                // If we have no destinations yet, do a full search
                performSearch();
            }
        });
    });
}

// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Family Trip Finder initializing...');

    // Initialize map
    initializeMap();

    // Set up event listeners
    setupEventListeners();

    // Initialize time display
    updateTimeDisplay(document.getElementById('time-slider').value);

    console.log('Family Trip Finder ready!');
    console.log('Destinations will be fetched from OpenTripMap API when you search.');
});
