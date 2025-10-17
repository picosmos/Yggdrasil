// Helper: Create GeoHack URL for coordinates
export const createGeoHackUrl = (lat, lon) => {
    const latAbs = Math.abs(lat);
    const lonAbs = Math.abs(lon);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `https://geohack.toolforge.org/geohack.php?params=${latAbs}_${latDir}_${lonAbs}_${lonDir}`;
};