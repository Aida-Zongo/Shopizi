const { query } = require('../../db/pool');

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
    fee = zoneRes.rows[0].price_fcfa;
  } else {
    // If distance > 30km (max in our DB currently), calculate dynamically:
    // Base 3000 FCFA for 30km + 500 FCFA per additional 5km tranche
    const extraDistance = distance - 30;
    const extraTranches = Math.ceil(extraDistance / 5);
    fee = 3000 + (extraTranches * 500);
  }

  return { fee, distance };
}

module.exports = {
  calculateHaversineDistance,
  calculateDeliveryFee
};
