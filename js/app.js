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
    reachableDestinations: [], // Store filtered reachable destinations
    selectedDestination: null,
    driveTimeMinutes: 120, // Default 2 hours
    activeFilters: new Set(['theme_park', 'beach', 'nature', 'museum', 'zoo', 'historic']),
    isLoading: false,
    favorites: new Set(), // Store favorite destination IDs
    showFavoritesOnly: false,
    sortBy: 'drive_time', // drive_time, rating, name
    expandedCard: null, // Track which card is expanded
    recentLocations: [], // Recent search locations
    tripPlan: [], // Destinations added to trip
    referral: {
        code: null,
        invites: 0,
        signups: 0,
        points: 0,
        history: [],
        claimedRewards: []
    }
};

// =============================================================================
// Favorites Management (localStorage)
// =============================================================================

function loadFavorites() {
    try {
        const stored = localStorage.getItem('familyTripFinder_favorites');
        if (stored) {
            state.favorites = new Set(JSON.parse(stored));
        }
    } catch (e) {
        console.warn('Could not load favorites from localStorage:', e);
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('familyTripFinder_favorites', JSON.stringify([...state.favorites]));
    } catch (e) {
        console.warn('Could not save favorites to localStorage:', e);
    }
}

function toggleFavorite(id) {
    if (state.favorites.has(id)) {
        state.favorites.delete(id);
    } else {
        state.favorites.add(id);
    }
    saveFavorites();
    updateFavoriteButtons();
}

function isFavorite(id) {
    return state.favorites.has(id);
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const id = btn.dataset.id;
        btn.classList.toggle('favorited', state.favorites.has(id));
        btn.innerHTML = state.favorites.has(id) ? '❤️' : '🤍';
    });
}

// =============================================================================
// Recent Locations (localStorage)
// =============================================================================

function loadRecentLocations() {
    try {
        const stored = localStorage.getItem('familyTripFinder_recentLocations');
        if (stored) {
            state.recentLocations = JSON.parse(stored);
            updateRecentLocationsDatalist();
        }
    } catch (e) {
        console.warn('Could not load recent locations:', e);
    }
}

function saveRecentLocation(location, displayName) {
    // Add to front, remove duplicates, keep max 5
    const newLocation = {
        lat: location.lat,
        lng: location.lng,
        name: displayName.split(',')[0], // Short name
        fullName: displayName
    };

    state.recentLocations = state.recentLocations.filter(
        loc => loc.lat !== location.lat || loc.lng !== location.lng
    );
    state.recentLocations.unshift(newLocation);
    state.recentLocations = state.recentLocations.slice(0, 5);

    try {
        localStorage.setItem('familyTripFinder_recentLocations', JSON.stringify(state.recentLocations));
    } catch (e) {
        console.warn('Could not save recent locations:', e);
    }

    updateRecentLocationsDatalist();
}

function updateRecentLocationsDatalist() {
    const datalist = document.getElementById('recent-locations');
    if (!datalist) return;

    datalist.innerHTML = state.recentLocations.map(loc =>
        `<option value="${loc.fullName}">`
    ).join('');
}

// =============================================================================
// Trip Planner (localStorage)
// =============================================================================

function loadTripPlan() {
    try {
        const stored = localStorage.getItem('familyTripFinder_tripPlan');
        if (stored) {
            state.tripPlan = JSON.parse(stored);
            updateTripPlanUI();
        }
    } catch (e) {
        console.warn('Could not load trip plan:', e);
    }
}

function saveTripPlan() {
    try {
        localStorage.setItem('familyTripFinder_tripPlan', JSON.stringify(state.tripPlan));
    } catch (e) {
        console.warn('Could not save trip plan:', e);
    }
}

function addToTrip(destination) {
    // Check if already in trip
    if (state.tripPlan.some(d => d.id === destination.id)) {
        showToast('Already in your trip!');
        return;
    }

    state.tripPlan.push({
        id: destination.id,
        name: destination.name,
        lat: destination.lat,
        lng: destination.lng,
        driveTime: destination.driveTime,
        imageEmoji: destination.imageEmoji
    });

    saveTripPlan();
    updateTripPlanUI();
    updateAddToTripButtons();
    showToast(`Added ${destination.name} to trip!`);
}

function removeFromTrip(id) {
    state.tripPlan = state.tripPlan.filter(d => d.id !== id);
    saveTripPlan();
    updateTripPlanUI();
    updateAddToTripButtons();
}

function clearTrip() {
    if (state.tripPlan.length === 0) return;
    if (confirm('Clear all destinations from your trip?')) {
        state.tripPlan = [];
        saveTripPlan();
        updateTripPlanUI();
        updateAddToTripButtons();
        showToast('Trip cleared');
    }
}

function updateTripPlanUI() {
    const listEl = document.getElementById('trip-list');
    const countEl = document.getElementById('trip-count');
    const summaryEl = document.getElementById('trip-summary');
    const shareBtn = document.getElementById('share-trip');
    const clearBtn = document.getElementById('clear-trip');

    if (!listEl) return;

    countEl.textContent = `(${state.tripPlan.length})`;

    // Enable/disable action buttons
    const hasTrip = state.tripPlan.length > 0;
    if (shareBtn) shareBtn.disabled = !hasTrip;
    if (clearBtn) clearBtn.disabled = !hasTrip;

    if (state.tripPlan.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Add destinations to plan your trip!</p>';
        summaryEl?.classList.add('hidden');
        return;
    }

    listEl.innerHTML = state.tripPlan.map((dest, index) => `
        <div class="trip-item" data-id="${dest.id}">
            <span class="trip-item-number">${index + 1}</span>
            <div class="trip-item-info">
                <div class="trip-item-name">${dest.imageEmoji} ${dest.name}</div>
                <div class="trip-item-time">${dest.driveTime ? formatDriveTime(dest.driveTime) : ''}</div>
            </div>
            <button class="trip-item-remove" data-id="${dest.id}" title="Remove">✕</button>
        </div>
    `).join('');

    // Add remove handlers
    listEl.querySelectorAll('.trip-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromTrip(btn.dataset.id);
        });
    });

    // Update summary
    if (summaryEl) {
        summaryEl.classList.remove('hidden');
        const totalTime = state.tripPlan.reduce((sum, d) => sum + (d.driveTime || 0), 0);
        const totalDistance = calculateTotalTripDistance();

        document.getElementById('trip-total-time').textContent = formatDriveTime(totalTime);
        document.getElementById('trip-total-distance').textContent = `${Math.round(totalDistance)} mi`;
        document.getElementById('trip-stops').textContent = state.tripPlan.length;
    }
}

function calculateTotalTripDistance() {
    if (!state.userLocation || state.tripPlan.length === 0) return 0;

    let total = 0;
    let prevLocation = state.userLocation;

    state.tripPlan.forEach(dest => {
        total += calculateDistance(prevLocation, { lat: dest.lat, lng: dest.lng });
        prevLocation = { lat: dest.lat, lng: dest.lng };
    });

    return total;
}

function updateAddToTripButtons() {
    document.querySelectorAll('.btn-add-trip').forEach(btn => {
        const id = btn.dataset.id;
        const inTrip = state.tripPlan.some(d => d.id === id);
        btn.classList.toggle('added', inTrip);
        btn.textContent = inTrip ? '✓ In Trip' : '+ Add to Trip';
    });
}

// =============================================================================
// Distance Calculation
// =============================================================================

function calculateDistance(from, to) {
    const R = 3959; // Earth's radius in miles
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMiles = R * c;

    // Apply road factor
    return Math.round(distanceMiles * 1.3);
}

// =============================================================================
// Share Functionality
// =============================================================================

function showShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function generateShareText() {
    if (state.tripPlan.length === 0) return '';

    let text = '🚗 My Family Trip Plan\n\n';
    state.tripPlan.forEach((dest, i) => {
        text += `${i + 1}. ${dest.imageEmoji} ${dest.name}`;
        if (dest.driveTime) {
            text += ` (${formatDriveTime(dest.driveTime)})`;
        }
        text += '\n';
    });

    const totalTime = state.tripPlan.reduce((sum, d) => sum + (d.driveTime || 0), 0);
    text += `\nTotal drive time: ${formatDriveTime(totalTime)}`;
    text += '\n\nPlanned with Family Trip Finder';

    return text;
}

async function shareViaWebShare() {
    const text = generateShareText();

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Family Trip Plan',
                text: text
            });
            hideShareModal();
        } catch (e) {
            if (e.name !== 'AbortError') {
                showToast('Could not share');
            }
        }
    } else {
        // Fallback to copy
        copyTripToClipboard();
    }
}

function copyTripToClipboard() {
    const text = generateShareText();

    navigator.clipboard.writeText(text).then(() => {
        showToast('Trip copied to clipboard!');
        hideShareModal();
    }).catch(() => {
        showToast('Could not copy');
    });
}

function printTrip() {
    const text = generateShareText();
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <html>
        <head>
            <title>My Family Trip Plan</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
                h1 { color: #6366f1; }
                ol { padding-left: 1.5rem; }
                li { margin-bottom: 0.5rem; }
                .summary { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ccc; }
            </style>
        </head>
        <body>
            <h1>🚗 My Family Trip Plan</h1>
            <ol>
                ${state.tripPlan.map(d => `<li><strong>${d.name}</strong>${d.driveTime ? ` - ${formatDriveTime(d.driveTime)} drive` : ''}</li>`).join('')}
            </ol>
            <div class="summary">
                <p><strong>Total stops:</strong> ${state.tripPlan.length}</p>
                <p><strong>Total drive time:</strong> ${formatDriveTime(state.tripPlan.reduce((sum, d) => sum + (d.driveTime || 0), 0))}</p>
            </div>
            <p style="color: #666; font-size: 0.875rem; margin-top: 2rem;">Planned with Family Trip Finder</p>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
    hideShareModal();
}

// =============================================================================
// Referral Program System
// =============================================================================

const REFERRAL_CONFIG = {
    pointsPerSignup: 10,
    tiers: {
        starter: { minPoints: 0, name: 'Starter' },
        bronze: { minPoints: 25, name: 'Bronze' },
        silver: { minPoints: 50, name: 'Silver' },
        gold: { minPoints: 100, name: 'Gold' },
        platinum: { minPoints: 250, name: 'Platinum' }
    },
    rewards: {
        customThemes: { cost: 25, name: 'Custom Themes' },
        premiumFeatures: { cost: 50, name: 'Premium Features' },
        vipStatus: { cost: 100, name: 'VIP Status' }
    }
};

function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FTF-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function loadReferralData() {
    try {
        const stored = localStorage.getItem('familyTripFinder_referral');
        if (stored) {
            const data = JSON.parse(stored);
            state.referral = { ...state.referral, ...data };
        }

        // Generate code if not exists
        if (!state.referral.code) {
            state.referral.code = generateReferralCode();
            saveReferralData();
        }

        updateReferralUI();
    } catch (e) {
        console.warn('Could not load referral data:', e);
        state.referral.code = generateReferralCode();
    }
}

function saveReferralData() {
    try {
        localStorage.setItem('familyTripFinder_referral', JSON.stringify(state.referral));
    } catch (e) {
        console.warn('Could not save referral data:', e);
    }
}

function getCurrentTier() {
    const points = state.referral.points;
    let currentTier = REFERRAL_CONFIG.tiers.starter;

    for (const tier of Object.values(REFERRAL_CONFIG.tiers)) {
        if (points >= tier.minPoints) {
            currentTier = tier;
        }
    }

    return currentTier;
}

function addReferralPoints(points, reason) {
    state.referral.points += points;
    state.referral.history.unshift({
        type: 'earned',
        points: points,
        reason: reason,
        date: new Date().toISOString()
    });

    // Keep history to last 50 entries
    if (state.referral.history.length > 50) {
        state.referral.history = state.referral.history.slice(0, 50);
    }

    saveReferralData();
    updateReferralUI();
}

function recordReferralInvite() {
    state.referral.invites++;
    saveReferralData();
    updateReferralUI();
}

function recordReferralSignup() {
    state.referral.signups++;
    addReferralPoints(REFERRAL_CONFIG.pointsPerSignup, 'Friend signed up');
    showToast(`+${REFERRAL_CONFIG.pointsPerSignup} points! Friend signed up!`);
}

function claimReward(rewardKey) {
    const reward = REFERRAL_CONFIG.rewards[rewardKey];
    if (!reward) return;

    if (state.referral.points < reward.cost) {
        showToast('Not enough points!');
        return;
    }

    if (state.referral.claimedRewards.includes(rewardKey)) {
        showToast('Already claimed!');
        return;
    }

    state.referral.points -= reward.cost;
    state.referral.claimedRewards.push(rewardKey);
    state.referral.history.unshift({
        type: 'redeemed',
        points: -reward.cost,
        reason: `Claimed ${reward.name}`,
        date: new Date().toISOString()
    });

    saveReferralData();
    updateReferralUI();
    showToast(`Claimed ${reward.name}!`);
}

function updateReferralUI() {
    // Update referral code display
    const codeEl = document.getElementById('referral-code');
    if (codeEl) {
        codeEl.textContent = state.referral.code || 'Loading...';
    }

    // Update stats
    const invitesEl = document.getElementById('referral-invites');
    const signupsEl = document.getElementById('referral-signups');
    const rewardsEl = document.getElementById('referral-rewards');

    if (invitesEl) invitesEl.textContent = state.referral.invites;
    if (signupsEl) signupsEl.textContent = state.referral.signups;
    if (rewardsEl) rewardsEl.textContent = state.referral.points;

    // Update modal if open
    updateReferralModal();
}

function updateReferralModal() {
    const totalPointsEl = document.getElementById('modal-total-points');
    const currentTierEl = document.getElementById('modal-current-tier');
    const historyListEl = document.getElementById('referral-history-list');

    if (totalPointsEl) {
        totalPointsEl.textContent = state.referral.points;
    }

    if (currentTierEl) {
        currentTierEl.textContent = getCurrentTier().name;
    }

    // Update history list
    if (historyListEl) {
        if (state.referral.history.length === 0) {
            historyListEl.innerHTML = '<p class="empty-state">No referral activity yet. Share your code to get started!</p>';
        } else {
            historyListEl.innerHTML = state.referral.history.slice(0, 10).map(item => {
                const icon = item.type === 'earned' ? '🎉' : '🎁';
                const pointsClass = item.type === 'earned' ? 'history-points' : '';
                const pointsDisplay = item.points > 0 ? `+${item.points}` : item.points;
                const date = new Date(item.date).toLocaleDateString();

                return `
                    <div class="history-item">
                        <span class="history-icon">${icon}</span>
                        <div class="history-details">
                            <div class="history-title">${item.reason}</div>
                            <div class="history-date">${date}</div>
                        </div>
                        <span class="${pointsClass}">${pointsDisplay}</span>
                    </div>
                `;
            }).join('');
        }
    }

    // Update reward claim buttons
    document.querySelectorAll('.reward-item').forEach(item => {
        const cost = parseInt(item.dataset.cost);
        const claimBtn = item.querySelector('.btn-claim');

        if (claimBtn) {
            const rewardKey = getRewardKeyByCost(cost);
            const isAvailable = state.referral.points >= cost && !state.referral.claimedRewards.includes(rewardKey);
            const isClaimed = state.referral.claimedRewards.includes(rewardKey);

            claimBtn.disabled = !isAvailable;
            claimBtn.textContent = isClaimed ? 'Claimed' : 'Claim';
            item.classList.toggle('available', isAvailable);
        }
    });
}

function getRewardKeyByCost(cost) {
    for (const [key, reward] of Object.entries(REFERRAL_CONFIG.rewards)) {
        if (reward.cost === cost) return key;
    }
    return null;
}

function copyReferralCode() {
    const code = state.referral.code;
    const shareText = `Join me on Family Trip Finder! Use my referral code: ${code}\n\nPlan amazing family road trips: https://familytripfinder.app/?ref=${code}`;

    navigator.clipboard.writeText(shareText).then(() => {
        recordReferralInvite();
        showToast('Referral code copied!');
    }).catch(() => {
        showToast('Could not copy code');
    });
}

async function shareReferralLink() {
    const code = state.referral.code;
    const shareData = {
        title: 'Join Family Trip Finder!',
        text: `Plan amazing family road trips with me! Use my referral code: ${code}`,
        url: `https://familytripfinder.app/?ref=${code}`
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            recordReferralInvite();
        } catch (e) {
            if (e.name !== 'AbortError') {
                copyReferralCode();
            }
        }
    } else {
        copyReferralCode();
    }
}

function showReferralModal() {
    const modal = document.getElementById('referral-modal');
    if (modal) {
        updateReferralModal();
        modal.classList.remove('hidden');
    }
}

function hideReferralModal() {
    const modal = document.getElementById('referral-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Check for referral code in URL on load
function checkReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && refCode !== state.referral.code) {
        // Simulate signup from referral (in real app, this would be server-side)
        const referrerData = localStorage.getItem(`familyTripFinder_referred_${refCode}`);
        if (!referrerData) {
            localStorage.setItem(`familyTripFinder_referred_${refCode}`, 'true');
            showToast(`Welcome! You joined via referral code: ${refCode}`);
        }
    }
}

// =============================================================================
// Toast Notifications
// =============================================================================

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// =============================================================================
// Sorting
// =============================================================================

function sortDestinations(destinations, sortBy) {
    const sorted = [...destinations];
    switch (sortBy) {
        case 'drive_time':
            sorted.sort((a, b) => (a.driveTime || 999) - (b.driveTime || 999));
            break;
        case 'rating':
            sorted.sort((a, b) => (b.kidFriendlyRating || 0) - (a.kidFriendlyRating || 0));
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    return sorted;
}

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

    // Save to recent locations
    saveRecentLocation(location, displayName);

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

    // Store for later use (sorting, favorites toggle)
    state.reachableDestinations = reachableDestinations;

    // Apply sorting
    const sortedDestinations = sortDestinations(reachableDestinations, state.sortBy);

    // Filter by favorites if enabled
    const displayDestinations = state.showFavoritesOnly
        ? sortedDestinations.filter(d => state.favorites.has(d.id))
        : sortedDestinations;

    // Add markers for reachable destinations
    displayDestinations.forEach(dest => {
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
    updateResultsList(displayDestinations);
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

    const totalCount = state.reachableDestinations?.length || destinations.length;
    const favCount = state.showFavoritesOnly ? destinations.length : '';
    countEl.textContent = state.showFavoritesOnly
        ? `(${favCount} favorites)`
        : `(${totalCount})`;

    if (destinations.length === 0) {
        const message = state.showFavoritesOnly
            ? 'No favorites yet. Click the heart icon on destinations to save them!'
            : 'No destinations found within your drive time. Try increasing the time or changing filters.';
        listEl.innerHTML = `<p class="empty-state">${message}</p>`;
        return;
    }

    listEl.innerHTML = destinations.map(dest => {
        const typeInfo = DESTINATION_TYPES[dest.type];
        const driveTimeStr = formatDriveTime(dest.driveTime);
        const stars = '⭐'.repeat(Math.min(dest.kidFriendlyRating || 3, 5));
        const isFav = state.favorites.has(dest.id);
        const isExpanded = state.expandedCard === dest.id;
        const cityDisplay = dest.city || 'Nearby';
        const inTrip = state.tripPlan.some(d => d.id === dest.id);
        const distance = state.userLocation
            ? calculateDistance(state.userLocation, { lat: dest.lat, lng: dest.lng })
            : null;

        return `
            <div class="result-card ${isExpanded ? 'expanded' : ''}" data-id="${dest.id}">
                <button class="favorite-btn ${isFav ? 'favorited' : ''}" data-id="${dest.id}" title="Save to favorites">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="result-card-header">
                    <span class="result-card-icon">${dest.imageEmoji}</span>
                    <div class="result-card-info">
                        <div class="result-card-title">${dest.name}</div>
                        <div class="result-card-location">${cityDisplay}</div>
                    </div>
                </div>
                <div class="result-card-meta">
                    <span class="result-card-drive-time">🚗 ${driveTimeStr}</span>
                    ${distance ? `<span class="result-card-distance">📍 ${distance} mi</span>` : ''}
                    <span class="result-card-rating">${stars}</span>
                </div>
                <div class="result-card-details" data-xid="${dest.xid || ''}">
                    <p class="result-card-description loading">Loading details...</p>
                    <div class="result-card-actions">
                        <button class="btn btn-primary btn-directions" data-lat="${dest.lat}" data-lng="${dest.lng}">
                            🗺️ Directions
                        </button>
                        <button class="btn btn-add-trip ${inTrip ? 'added' : ''}" data-id="${dest.id}">
                            ${inTrip ? '✓ In Trip' : '+ Add to Trip'}
                        </button>
                    </div>
                </div>
                <div class="expand-indicator">▼</div>
            </div>
        `;
    }).join('');

    // Add click handlers for cards
    listEl.querySelectorAll('.result-card').forEach(card => {
        // Main card click - expand/collapse and show on map
        card.addEventListener('click', (e) => {
            // Ignore if clicking favorite button or action buttons
            if (e.target.closest('.favorite-btn') || e.target.closest('.result-card-actions')) {
                return;
            }

            const id = card.dataset.id;
            toggleCardExpansion(id, card);
            highlightDestination(id);
            panToDestination(id);
        });
    });

    // Add click handlers for favorite buttons
    listEl.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            toggleFavorite(id);
        });
    });

    // Add click handlers for directions buttons
    listEl.querySelectorAll('.btn-directions').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lat = btn.dataset.lat;
            const lng = btn.dataset.lng;
            openDirections(lat, lng);
        });
    });

    // Add click handlers for "Add to Trip" buttons
    listEl.querySelectorAll('.btn-add-trip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const dest = state.reachableDestinations.find(d => d.id === id);
            if (dest) {
                if (state.tripPlan.some(d => d.id === id)) {
                    removeFromTrip(id);
                } else {
                    addToTrip(dest);
                }
            }
        });
    });
}

function toggleCardExpansion(id, cardElement) {
    const wasExpanded = state.expandedCard === id;

    // Collapse previously expanded card
    if (state.expandedCard && state.expandedCard !== id) {
        const prevCard = document.querySelector(`.result-card[data-id="${state.expandedCard}"]`);
        if (prevCard) {
            prevCard.classList.remove('expanded');
        }
    }

    if (wasExpanded) {
        // Collapse this card
        state.expandedCard = null;
        cardElement.classList.remove('expanded');
    } else {
        // Expand this card
        state.expandedCard = id;
        cardElement.classList.add('expanded');

        // Fetch details if we have an xid
        const detailsEl = cardElement.querySelector('.result-card-details');
        const xid = detailsEl?.dataset.xid;
        if (xid && typeof DestinationAPI !== 'undefined') {
            fetchAndDisplayDetails(xid, detailsEl);
        } else {
            // No xid, show basic description from destination data
            const dest = state.reachableDestinations.find(d => d.id === id);
            const descEl = detailsEl?.querySelector('.result-card-description');
            if (descEl && dest) {
                descEl.textContent = dest.description || 'No additional details available.';
                descEl.classList.remove('loading');
            }
        }
    }
}

async function fetchAndDisplayDetails(xid, detailsEl) {
    const descEl = detailsEl.querySelector('.result-card-description');
    if (!descEl) return;

    try {
        const details = await DestinationAPI.fetchDestinationDetails(xid);
        if (details && details.description) {
            descEl.textContent = details.description;
        } else {
            descEl.textContent = 'No additional details available.';
        }
    } catch (error) {
        descEl.textContent = 'Could not load details.';
    }
    descEl.classList.remove('loading');
}

function openDirections(lat, lng) {
    // Open Google Maps directions from user location
    const from = state.userLocation
        ? `${state.userLocation.lat},${state.userLocation.lng}`
        : '';
    const to = `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/${from}/${to}`;
    window.open(url, '_blank');
}

function refreshResultsList() {
    // Re-display with current sorting and filtering
    if (state.isochroneFeature && state.reachableDestinations.length > 0) {
        const sortedDestinations = sortDestinations(state.reachableDestinations, state.sortBy);
        const displayDests = state.showFavoritesOnly
            ? sortedDestinations.filter(d => state.favorites.has(d.id))
            : sortedDestinations;
        updateResultsList(displayDests);
    }
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

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            refreshResultsList();
        });
    }

    // Favorites toggle
    const favToggle = document.getElementById('toggle-favorites');
    if (favToggle) {
        favToggle.addEventListener('click', () => {
            state.showFavoritesOnly = !state.showFavoritesOnly;
            favToggle.classList.toggle('active', state.showFavoritesOnly);
            favToggle.title = state.showFavoritesOnly ? 'Show All' : 'Show Favorites';
            refreshResultsList();
        });
    }

    // Mobile panel toggle
    const mobileToggle = document.getElementById('mobile-panel-toggle');
    const controlPanel = document.querySelector('.control-panel');

    if (mobileToggle && controlPanel) {
        mobileToggle.addEventListener('click', () => {
            controlPanel.classList.toggle('expanded');
            document.body.classList.toggle('panel-open');
            const isExpanded = controlPanel.classList.contains('expanded');
            mobileToggle.querySelector('.toggle-text').textContent = isExpanded ? 'Hide Panel' : 'Show Results';
        });

        // Allow swiping down to close panel on mobile
        let touchStartY = 0;
        controlPanel.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        controlPanel.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const diff = touchY - touchStartY;

            // If swiping down significantly, collapse the panel
            if (diff > 100 && controlPanel.classList.contains('expanded')) {
                controlPanel.classList.remove('expanded');
                document.body.classList.remove('panel-open');
                mobileToggle.querySelector('.toggle-text').textContent = 'Show Results';
            }
        }, { passive: true });
    }

    // Trip planner buttons
    const shareTripBtn = document.getElementById('share-trip');
    const clearTripBtn = document.getElementById('clear-trip');

    if (shareTripBtn) {
        shareTripBtn.addEventListener('click', showShareModal);
    }

    if (clearTripBtn) {
        clearTripBtn.addEventListener('click', clearTrip);
    }

    // Share modal
    const closeShareModal = document.getElementById('close-share-modal');
    const shareModal = document.getElementById('share-modal');
    const shareCopyLink = document.getElementById('share-copy-link');
    const shareNative = document.getElementById('share-native');
    const sharePrint = document.getElementById('share-print');

    if (closeShareModal) {
        closeShareModal.addEventListener('click', hideShareModal);
    }

    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                hideShareModal();
            }
        });
    }

    if (shareCopyLink) {
        shareCopyLink.addEventListener('click', copyTripToClipboard);
    }

    if (shareNative) {
        shareNative.addEventListener('click', shareViaWebShare);
    }

    if (sharePrint) {
        sharePrint.addEventListener('click', printTrip);
    }

    // Referral system event listeners
    const copyReferralCodeBtn = document.getElementById('copy-referral-code');
    const shareReferralBtn = document.getElementById('share-referral');
    const viewHistoryBtn = document.getElementById('view-referral-history');
    const closeReferralModalBtn = document.getElementById('close-referral-modal');
    const referralModal = document.getElementById('referral-modal');

    if (copyReferralCodeBtn) {
        copyReferralCodeBtn.addEventListener('click', copyReferralCode);
    }

    if (shareReferralBtn) {
        shareReferralBtn.addEventListener('click', shareReferralLink);
    }

    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', showReferralModal);
    }

    if (closeReferralModalBtn) {
        closeReferralModalBtn.addEventListener('click', hideReferralModal);
    }

    if (referralModal) {
        referralModal.addEventListener('click', (e) => {
            if (e.target === referralModal) {
                hideReferralModal();
            }
        });
    }

    // Reward claim buttons
    document.querySelectorAll('.btn-claim').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rewardItem = e.target.closest('.reward-item');
            const cost = parseInt(rewardItem?.dataset.cost);
            const rewardKey = getRewardKeyByCost(cost);
            if (rewardKey) {
                claimReward(rewardKey);
            }
        });
    });
}

// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Family Trip Finder initializing...');

    // Load data from localStorage
    loadFavorites();
    loadRecentLocations();
    loadTripPlan();
    loadReferralData();

    // Check for referral code in URL
    checkReferralCode();

    // Initialize map
    initializeMap();

    // Set up event listeners
    setupEventListeners();

    // Initialize time display
    updateTimeDisplay(document.getElementById('time-slider').value);

    console.log('Family Trip Finder ready!');
    console.log('Destinations will be fetched from OpenTripMap API when you search.');
    console.log(`Loaded ${state.favorites.size} favorites, ${state.recentLocations.length} recent locations, ${state.tripPlan.length} trip items.`);
    console.log(`Referral code: ${state.referral.code}, Points: ${state.referral.points}`);
});
