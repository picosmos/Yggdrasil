/**
 * Formats coordinates with direction indicators
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {{lat: number, lon: number, latDir: string, lonDir: string, formatted: string}} Formatted coordinate data
 */
export const formatCoordinates = (lat, lon) => {
    const latAbs = Math.abs(lat);
    const lonAbs = Math.abs(lon);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    return {
        lat: latAbs,
        lon: lonAbs,
        latDir,
        lonDir,
        formatted: `${latAbs.toFixed(6)}° ${latDir}, ${lonAbs.toFixed(6)}° ${lonDir}`
    };
};

// Helper: Create GeoHack URL for coordinates
export const createGeoHackUrl = (lat, lon) => {
    const { lat: latAbs, lon: lonAbs, latDir, lonDir } = formatCoordinates(lat, lon);
    return `https://geohack.toolforge.org/geohack.php?params=${latAbs}_${latDir}_${lonAbs}_${lonDir}`;
};