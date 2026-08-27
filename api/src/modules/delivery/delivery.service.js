const { query } = require('../../db/pool');

// Shopizi ne gere que la livraison intra-ville : les frais sont plafonnes.
const DELIVERY_FEE_CAP_FCFA = 2000;

// Centres approximatifs des principales villes couvertes. Sert de position
// de repli quand une boutique n'a pas configure ses coordonnees GPS, et a
// deduire la ville d'un client depuis sa position.
const CITY_CENTERS = {
  'ouagadougou':    { lat: 12.3714, lng: -1.5197 },
  'bobo-dioulasso': { lat: 11.1771, lng: -4.2979 },
  'koudougou':      { lat: 12.2540, lng: -2.3636 },
  'banfora':        { lat: 10.6333, lng: -4.7500 },
};

// Au-dela de ce rayon autour d'un centre-ville, on considere qu'on n'est
// plus dans cette ville.
const SAME_CITY_RADIUS_KM = 30;

function getCityCenter(cityName) {
  if (!cityName) return null;
  return CITY_CENTERS[cityName.toLowerCase().trim()] || null;
}

function findNearestCity(lat, lng) {
  let best = null;
  for (const [slug, c] of Object.entries(CITY_CENTERS)) {
    const d = calculateHaversineDistance(lat, lng, c.lat, c.lng);
    if (d !== null && (best === null || d < best.distance)) best = { slug, distance: d };
  }
  return best;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in decimal degrees
 * @param {number} lon1 - Longitude of point 1 in decimal degrees
 * @param {number} lat2 - Latitude of point 2 in decimal degrees
 * @param {number} lon2 - Longitude of point 2 in decimal degrees
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculates the delivery fee based on coordinates.
 * 
 * @param {number} lat1 - Shop latitude
 * @param {number} lng1 - Shop longitude
 * @param {number} lat2 - Client latitude
 * @param {number} lng2 - Client longitude
 * @returns {Promise<{fee: number, distance: number}>} Fee in FCFA and distance in km
 */
async function calculateDeliveryFee(lat1, lng1, lat2, lng2) {
  const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);
  
  if (distance === null) {
    return { fee: null, distance: null };
  }

  // Find the corresponding delivery zone
  const zoneRes = await query(
    'SELECT price_fcfa FROM delivery_zones WHERE min_km <= $1 AND max_km > $1 LIMIT 1',
    [distance]
  );

  let fee = 0;

  if (zoneRes.rows.length > 0) {
    fee = Number(zoneRes.rows[0].price_fcfa);
  } else {
    // Distance au-dela de la derniere zone en base : plafond direct
    fee = DELIVERY_FEE_CAP_FCFA;
  }

  return { fee: Math.min(fee, DELIVERY_FEE_CAP_FCFA), distance };
}

/**
 * Calculates the delivery fee for a shop, enforcing the same-city rule.
 * Falls back to the shop's city center when it has no GPS coordinates.
 *
 * @param {{latitude: any, longitude: any, city_name: string|null}} shop
 * @param {number} clientLat - Client latitude
 * @param {number} clientLng - Client longitude
 * @returns {Promise<{fee: number|null, distance: number|null, estimated: boolean, same_city: boolean, shop_city: string|null}>}
 */
async function calculateShopDeliveryFee(shop, clientLat, clientLng) {
  const hasCoords = !!(Number(shop.latitude) && Number(shop.longitude));
  const cityCenter = getCityCenter(shop.city_name);
  const estimated = !hasCoords;

  // Boutique sans coordonnées GPS : impossible de calculer une vraie distance.
  // On retourne le tarif minimum (première zone) comme estimation, sans
  // inventer une distance depuis le centre-ville qui serait fausse et trompeuse
  // (le centre d'Ouagadougou est à ~12km d'une position réelle en ville,
  // ce qui génère une fausse distance et des frais incorrects).
  if (!hasCoords) {
    // Vérifier quand même que le client est dans la même ville que la boutique.
    const clientNearest = findNearestCity(Number(clientLat), Number(clientLng));
    const clientSlug = clientNearest && clientNearest.distance <= SAME_CITY_RADIUS_KM
      ? clientNearest.slug
      : null;
    const shopSlug = cityCenter ? shop.city_name.toLowerCase().trim() : null;
    const sameCity = (shopSlug && clientSlug) ? shopSlug === clientSlug : true;

    if (!sameCity) {
      return { fee: null, distance: null, estimated: true, same_city: false, shop_city: shop.city_name || null };
    }

    const minZoneRes = await query(
      'SELECT price_fcfa FROM delivery_zones ORDER BY min_km ASC LIMIT 1'
    );
    const minFee = minZoneRes.rows.length > 0 ? Number(minZoneRes.rows[0].price_fcfa) : 500;
    return {
      fee: Math.min(minFee, DELIVERY_FEE_CAP_FCFA),
      distance: null,
      estimated: true,
      same_city: true,
      shop_city: shop.city_name || null,
      no_gps: true,
    };
  }

  const origin = { lat: Number(shop.latitude), lng: Number(shop.longitude) };

  // Ville de la boutique : sa ville declaree si connue, sinon la ville la
  // plus proche de ses coordonnees reelles.
  let shopSlug = null;
  if (cityCenter) {
    shopSlug = shop.city_name.toLowerCase().trim();
  } else {
    const nearest = findNearestCity(origin.lat, origin.lng);
    if (nearest && nearest.distance <= SAME_CITY_RADIUS_KM) shopSlug = nearest.slug;
  }

  // Ville du client : centre connu le plus proche de sa position GPS.
  const clientNearest = findNearestCity(Number(clientLat), Number(clientLng));
  const clientSlug = clientNearest && clientNearest.distance <= SAME_CITY_RADIUS_KM
    ? clientNearest.slug
    : null;

  const distance = calculateHaversineDistance(origin.lat, origin.lng, Number(clientLat), Number(clientLng));

  // Meme ville si les deux villes sont connues et identiques ; sinon on se
  // rabat sur la distance brute (une livraison intra-ville reste courte).
  const sameCity = (shopSlug && clientSlug)
    ? shopSlug === clientSlug
    : (distance !== null && distance <= SAME_CITY_RADIUS_KM);

  if (!sameCity) {
    return { fee: null, distance, estimated, same_city: false, shop_city: shop.city_name || null };
  }

  const result = await calculateDeliveryFee(origin.lat, origin.lng, Number(clientLat), Number(clientLng));
  return { ...result, estimated, same_city: true, shop_city: shop.city_name || null };
}

module.exports = {
  calculateHaversineDistance,
  calculateDeliveryFee,
  calculateShopDeliveryFee,
  DELIVERY_FEE_CAP_FCFA
};
