/**
 * Family Trip Finder - Sample Destination Data
 *
 * Data Structure:
 * - id: Unique identifier
 * - name: Destination name
 * - type: Category (theme_park, beach, nature, museum, zoo, historic)
 * - lat, lng: Coordinates
 * - description: Short description
 * - kidFriendlyRating: 1-5 stars
 * - ageRange: Recommended age range
 * - amenities: Array of available amenities
 * - tips: Parent tips
 */

const DESTINATIONS = [
    // Theme Parks
    {
        id: 'tp001',
        name: 'Adventure Kingdom',
        type: 'theme_park',
        lat: 40.7580,
        lng: -73.8855,
        city: 'Queens, NY',
        description: 'Family-friendly theme park with rides for all ages, from gentle carousels to thrilling coasters.',
        kidFriendlyRating: 5,
        ageRange: '2-14',
        amenities: ['parking', 'stroller_rental', 'nursing_room', 'restaurants', 'first_aid'],
        tips: 'Arrive early on weekends. The splash zone is perfect for hot days!',
        imageEmoji: '🎢'
    },
    {
        id: 'tp002',
        name: 'Storybook Land',
        type: 'theme_park',
        lat: 39.4951,
        lng: -74.4663,
        city: 'Egg Harbor, NJ',
        description: 'Charming park with storybook-themed rides perfect for younger children.',
        kidFriendlyRating: 5,
        ageRange: '1-10',
        amenities: ['parking', 'picnic_area', 'restaurants', 'gift_shop'],
        tips: 'Great for toddlers! Most rides have no height requirements.',
        imageEmoji: '📚'
    },
    {
        id: 'tp003',
        name: 'Funland Pier',
        type: 'theme_park',
        lat: 38.5449,
        lng: -75.0583,
        city: 'Rehoboth Beach, DE',
        description: 'Classic boardwalk amusement park with arcade games and rides.',
        kidFriendlyRating: 4,
        ageRange: '3-16',
        amenities: ['restaurants', 'arcade', 'beach_access'],
        tips: 'Combine with a beach day! Games use tokens purchased on-site.',
        imageEmoji: '🎠'
    },

    // Beaches
    {
        id: 'bch001',
        name: 'Sandy Shores Beach',
        type: 'beach',
        lat: 40.5731,
        lng: -73.9712,
        city: 'Brooklyn, NY',
        description: 'Family-friendly beach with calm waters and a beautiful boardwalk.',
        kidFriendlyRating: 4,
        ageRange: 'All ages',
        amenities: ['lifeguards', 'restrooms', 'food_vendors', 'parking'],
        tips: 'The west end is less crowded. Bring sand toys!',
        imageEmoji: '🏖️'
    },
    {
        id: 'bch002',
        name: 'Cape May Beach',
        type: 'beach',
        lat: 38.9351,
        lng: -74.9060,
        city: 'Cape May, NJ',
        description: 'Pristine beach in a charming Victorian town with gentle waves.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['lifeguards', 'restrooms', 'showers', 'rentals', 'parking'],
        tips: 'Visit the lighthouse and look for dolphins! Beach tags required in summer.',
        imageEmoji: '🐚'
    },
    {
        id: 'bch003',
        name: 'Ocean City Boardwalk',
        type: 'beach',
        lat: 39.2776,
        lng: -74.5746,
        city: 'Ocean City, NJ',
        description: 'Famous family beach with 2.5-mile boardwalk full of attractions.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['lifeguards', 'restrooms', 'boardwalk', 'mini_golf', 'restaurants'],
        tips: 'Dry town - no alcohol. Try the famous fudge on the boardwalk!',
        imageEmoji: '🌊'
    },
    {
        id: 'bch004',
        name: 'Jones Beach',
        type: 'beach',
        lat: 40.5943,
        lng: -73.5004,
        city: 'Wantagh, NY',
        description: 'Expansive state park beach with pools, playgrounds, and nature trails.',
        kidFriendlyRating: 4,
        ageRange: 'All ages',
        amenities: ['lifeguards', 'pools', 'playground', 'nature_center', 'parking'],
        tips: 'The pool complex is great for kids not ready for ocean waves.',
        imageEmoji: '🏊'
    },

    // Nature
    {
        id: 'nat001',
        name: 'Bear Mountain State Park',
        type: 'nature',
        lat: 41.3126,
        lng: -73.9890,
        city: 'Bear Mountain, NY',
        description: 'Scenic park with hiking trails, zoo, and lake perfect for families.',
        kidFriendlyRating: 4,
        ageRange: '4+',
        amenities: ['hiking_trails', 'zoo', 'picnic_area', 'lake', 'parking'],
        tips: 'The Trailside Zoo is free! Easy trails for little hikers available.',
        imageEmoji: '🏔️'
    },
    {
        id: 'nat002',
        name: 'Delaware Water Gap',
        type: 'nature',
        lat: 41.0128,
        lng: -75.1277,
        city: 'Delaware Water Gap, PA',
        description: 'National recreation area with waterfalls, beaches, and easy hikes.',
        kidFriendlyRating: 4,
        ageRange: '3+',
        amenities: ['hiking_trails', 'swimming', 'waterfalls', 'picnic_area'],
        tips: 'Dingmans Falls has a boardwalk trail suitable for strollers.',
        imageEmoji: '🌲'
    },
    {
        id: 'nat003',
        name: 'Harriman State Park',
        type: 'nature',
        lat: 41.2262,
        lng: -74.0774,
        city: 'Stony Point, NY',
        description: 'Vast park with lakes, trails, and nature programs for kids.',
        kidFriendlyRating: 4,
        ageRange: '5+',
        amenities: ['hiking_trails', 'lakes', 'camping', 'picnic_area'],
        tips: 'Lake Welch has a great beach for families. Arrive early in summer!',
        imageEmoji: '🦌'
    },
    {
        id: 'nat004',
        name: 'Pine Barrens Adventure',
        type: 'nature',
        lat: 39.7839,
        lng: -74.5091,
        city: 'Chatsworth, NJ',
        description: 'Explore the unique Pine Barrens ecosystem with guided kayak tours.',
        kidFriendlyRating: 3,
        ageRange: '6+',
        amenities: ['kayak_rental', 'guided_tours', 'nature_center'],
        tips: 'Book kayak tours in advance. Great for older kids who can paddle.',
        imageEmoji: '🛶'
    },

    // Museums
    {
        id: 'mus001',
        name: 'Liberty Science Center',
        type: 'museum',
        lat: 40.7062,
        lng: -74.0551,
        city: 'Jersey City, NJ',
        description: 'Interactive science museum with planetarium and touch tanks.',
        kidFriendlyRating: 5,
        ageRange: '3-14',
        amenities: ['cafe', 'gift_shop', 'planetarium', 'parking'],
        tips: 'Allow 3-4 hours. The infinity climber is a must for adventurous kids!',
        imageEmoji: '🔬'
    },
    {
        id: 'mus002',
        name: 'American Museum of Natural History',
        type: 'museum',
        lat: 40.7813,
        lng: -73.9740,
        city: 'New York, NY',
        description: 'World-famous museum with dinosaurs, space shows, and wildlife exhibits.',
        kidFriendlyRating: 5,
        ageRange: '4+',
        amenities: ['cafe', 'gift_shop', 'planetarium', 'family_programs'],
        tips: 'Start with the dinosaurs! Get tickets for the planetarium show early.',
        imageEmoji: '🦕'
    },
    {
        id: 'mus003',
        name: 'Please Touch Museum',
        type: 'museum',
        lat: 39.9792,
        lng: -75.2094,
        city: 'Philadelphia, PA',
        description: 'Children\'s museum designed entirely for hands-on play and learning.',
        kidFriendlyRating: 5,
        ageRange: '1-7',
        amenities: ['cafe', 'nursing_room', 'birthday_parties', 'parking'],
        tips: 'Perfect for toddlers and preschoolers. The water play area is a hit!',
        imageEmoji: '🎨'
    },
    {
        id: 'mus004',
        name: 'Intrepid Sea, Air & Space Museum',
        type: 'museum',
        lat: 40.7645,
        lng: -73.9996,
        city: 'New York, NY',
        description: 'Aircraft carrier museum with planes, submarines, and space shuttle.',
        kidFriendlyRating: 4,
        ageRange: '5+',
        amenities: ['cafe', 'gift_shop', 'flight_simulators'],
        tips: 'Kids love exploring the submarine! Book flight simulator in advance.',
        imageEmoji: '🚀'
    },
    {
        id: 'mus005',
        name: 'Franklin Institute',
        type: 'museum',
        lat: 39.9582,
        lng: -75.1731,
        city: 'Philadelphia, PA',
        description: 'Premier science museum with giant heart walk-through and planetarium.',
        kidFriendlyRating: 5,
        ageRange: '4-14',
        amenities: ['cafe', 'imax', 'planetarium', 'gift_shop'],
        tips: 'The Sports Zone and electricity shows are favorites!',
        imageEmoji: '⚡'
    },

    // Zoos
    {
        id: 'zoo001',
        name: 'Bronx Zoo',
        type: 'zoo',
        lat: 40.8506,
        lng: -73.8769,
        city: 'Bronx, NY',
        description: 'One of the largest urban zoos with world-class exhibits and safari.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['stroller_rental', 'restaurants', 'train_ride', 'parking'],
        tips: 'Wednesdays are pay-what-you-wish. The Wild Asia Monorail is amazing!',
        imageEmoji: '🦁'
    },
    {
        id: 'zoo002',
        name: 'Philadelphia Zoo',
        type: 'zoo',
        lat: 39.9710,
        lng: -75.1953,
        city: 'Philadelphia, PA',
        description: 'America\'s first zoo with innovative animal trails and exhibits.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['stroller_rental', 'restaurants', 'carousel', 'parking'],
        tips: 'Zoo360 trails let animals roam overhead - so cool for kids!',
        imageEmoji: '🐘'
    },
    {
        id: 'zoo003',
        name: 'Turtle Back Zoo',
        type: 'zoo',
        lat: 40.7580,
        lng: -74.2641,
        city: 'West Orange, NJ',
        description: 'Beloved family zoo with train rides and touch encounters.',
        kidFriendlyRating: 5,
        ageRange: 'All ages',
        amenities: ['train_ride', 'carousel', 'playground', 'cafe', 'parking'],
        tips: 'Perfect size for young kids. Don\'t miss the penguin feeding!',
        imageEmoji: '🐢'
    },
    {
        id: 'zoo004',
        name: 'Central Park Zoo',
        type: 'zoo',
        lat: 40.7678,
        lng: -73.9718,
        city: 'New York, NY',
        description: 'Compact zoo in the heart of Central Park with sea lions and penguins.',
        kidFriendlyRating: 4,
        ageRange: 'All ages',
        amenities: ['cafe', 'gift_shop', '4d_theater'],
        tips: 'Small but manageable for little ones. Combine with Central Park playground!',
        imageEmoji: '🐧'
    },

    // Historic Sites
    {
        id: 'his001',
        name: 'Statue of Liberty & Ellis Island',
        type: 'historic',
        lat: 40.6892,
        lng: -74.0445,
        city: 'New York Harbor',
        description: 'Iconic landmark with museum about immigration history.',
        kidFriendlyRating: 4,
        ageRange: '5+',
        amenities: ['museum', 'cafe', 'gift_shop', 'audio_tour'],
        tips: 'Book crown tickets months ahead. Ferry ride alone is exciting for kids!',
        imageEmoji: '🗽'
    },
    {
        id: 'his002',
        name: 'Independence Hall',
        type: 'historic',
        lat: 39.9489,
        lng: -75.1500,
        city: 'Philadelphia, PA',
        description: 'Birthplace of the Declaration of Independence and Constitution.',
        kidFriendlyRating: 3,
        ageRange: '7+',
        amenities: ['visitor_center', 'ranger_programs', 'gift_shop'],
        tips: 'Free timed tickets required. The Liberty Bell is right next door!',
        imageEmoji: '🔔'
    },
    {
        id: 'his003',
        name: 'Gettysburg National Park',
        type: 'historic',
        lat: 39.8107,
        lng: -77.2311,
        city: 'Gettysburg, PA',
        description: 'Civil War battlefield with museum and guided tours.',
        kidFriendlyRating: 3,
        ageRange: '8+',
        amenities: ['museum', 'visitor_center', 'auto_tour', 'ranger_programs'],
        tips: 'The museum has great interactive exhibits. Junior Ranger program available!',
        imageEmoji: '🏛️'
    },
    {
        id: 'his004',
        name: 'West Point Military Academy',
        type: 'historic',
        lat: 41.3915,
        lng: -73.9565,
        city: 'West Point, NY',
        description: 'Historic military academy with museum and scenic Hudson views.',
        kidFriendlyRating: 3,
        ageRange: '6+',
        amenities: ['museum', 'visitor_center', 'guided_tours', 'gift_shop'],
        tips: 'Guided bus tours tell great stories. Check for parade schedules!',
        imageEmoji: '🎖️'
    },
    {
        id: 'his005',
        name: 'Mystic Seaport Museum',
        type: 'historic',
        lat: 41.3615,
        lng: -71.9662,
        city: 'Mystic, CT',
        description: 'Living history museum showcasing 19th-century maritime life.',
        kidFriendlyRating: 4,
        ageRange: '5+',
        amenities: ['ship_tours', 'planetarium', 'restaurants', 'gift_shop'],
        tips: 'Kids can explore real historic ships! Great hands-on activities.',
        imageEmoji: '⛵'
    }
];

// Destination type metadata for icons and labels
const DESTINATION_TYPES = {
    theme_park: {
        label: 'Theme Park',
        icon: '🎢',
        color: '#f59e0b'
    },
    beach: {
        label: 'Beach',
        icon: '🏖️',
        color: '#06b6d4'
    },
    nature: {
        label: 'Nature',
        icon: '🌲',
        color: '#10b981'
    },
    museum: {
        label: 'Museum',
        icon: '🏛️',
        color: '#8b5cf6'
    },
    zoo: {
        label: 'Zoo',
        icon: '🦁',
        color: '#f97316'
    },
    historic: {
        label: 'Historic Site',
        icon: '🏰',
        color: '#6366f1'
    }
};

// Amenity icons and labels
const AMENITIES = {
    parking: { icon: '🅿️', label: 'Parking' },
    stroller_rental: { icon: '👶', label: 'Stroller Rental' },
    nursing_room: { icon: '🍼', label: 'Nursing Room' },
    restaurants: { icon: '🍽️', label: 'Restaurants' },
    cafe: { icon: '☕', label: 'Café' },
    first_aid: { icon: '🏥', label: 'First Aid' },
    gift_shop: { icon: '🎁', label: 'Gift Shop' },
    restrooms: { icon: '🚻', label: 'Restrooms' },
    lifeguards: { icon: '🏊', label: 'Lifeguards' },
    picnic_area: { icon: '🧺', label: 'Picnic Area' },
    playground: { icon: '🛝', label: 'Playground' },
    hiking_trails: { icon: '🥾', label: 'Hiking Trails' }
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DESTINATIONS, DESTINATION_TYPES, AMENITIES };
}
