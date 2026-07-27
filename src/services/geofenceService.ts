import { getCities, City } from './city';
import { getAreas, Area } from './area';

export interface ServiceabilityResult {
  isAvailable: boolean;
  matchedAreaName?: string;
  matchedAreaObj?: Area;
  matchedCityName?: string;
  matchedCityObj?: City;
  message: string;
}

/**
 * Real-world geographic boundary polygons for supported areas.
 * Each polygon is an array of [latitude, longitude] vertices tracing area borders.
 * Easily extensible via API when backend sends custom area boundary coordinates.
 */
export const AREA_POLYGONS: Record<string, Array<[number, number]>> = {
  // Hardcoded boundary polygon tracing Bahria Town (Lahore)
  bahriatown: [
    [31.3880, 74.1680], // North West (Canal Road / Sector F)
    [31.3820, 74.1960], // North East (Canal Bank Rd / Sector A)
    [31.3580, 74.2000], // East (Sector E / Sector D boundary)
    [31.3340, 74.1860], // South (Sector F / Golf Course)
    [31.3380, 74.1540], // South West (Sector F West)
    [31.3650, 74.1500], // West (Outer Perimeter)
  ],

  // Hardcoded boundary polygon tracing Model Town (Lahore)
  modeltown: [
    [31.5000, 74.3280], // North (Kalma Chowk / Garden Town border)
    [31.4960, 74.3420], // North East (Ferozepur Road)
    [31.4780, 74.3400], // East (Ferozepur Road / Block C & D)
    [31.4650, 74.3350], // South East (Model Town Link Road Junction)
    [31.4640, 74.3200], // South (Model Town Link Road / Township border)
    [31.4720, 74.3080], // South West (Maulana Shaukat Ali Road)
    [31.4880, 74.3120], // West (Maulana Shaukat Ali Road / Faisal Town)
    [31.4980, 74.3180], // North West (Garden Town border)
  ],
};

// Export CITY_POLYGONS as alias for backwards compatibility
export const CITY_POLYGONS = AREA_POLYGONS;

// Default supported areas baseline
const DEFAULT_AREAS: Area[] = [
  { id: 1, name: 'Bahria Town' },
  { id: 2, name: 'Model Town' },
];

const DEFAULT_CITIES: City[] = [
  { id: 1, name: 'Lahore' },
];

let cachedCities: City[] = [...DEFAULT_CITIES];
let cachedAreas: Area[] = [...DEFAULT_AREAS];

function normalize(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Standard Ray-Casting Point-in-Polygon Algorithm.
 * Determines if point (lat, lng) is physically inside polygon vertices array.
 */
export const isPointInPolygon = (
  lat: number,
  lng: number,
  polygon: Array<[number, number]>
): boolean => {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
};

export const initializeGeofenceService = async (): Promise<void> => {
  try {
    const [cities, areas] = await Promise.all([
      getCities().catch(() => []),
      getAreas().catch(() => []),
    ]);

    if (cities && cities.length > 0) {
      cachedCities = cities;
    }
    if (areas && areas.length > 0) {
      cachedAreas = [...DEFAULT_AREAS, ...areas];
    }
  } catch (error) {
    console.log('[geofenceService] Initialized with baseline supported areas.');
  }
};

export const getCachedCitiesAndAreas = () => {
  return { cities: cachedCities, areas: cachedAreas };
};

/**
 * Primary Geofence Validation:
 * Checks if lat/lng coordinates fall inside active area polygon boundaries.
 */
export const validateCoordinatesServiceability = (
  lat: number,
  lng: number
): ServiceabilityResult => {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return { isAvailable: false, message: 'Services Not Available in this location' };
  }

  // 1. Check active backend cached areas first
  for (const area of cachedAreas) {
    const areaKey = normalize(area.name);
    const polygon = (area as any).boundary_polygon || AREA_POLYGONS[areaKey];

    if (polygon && isPointInPolygon(lat, lng, polygon)) {
      return {
        isAvailable: true,
        matchedAreaName: area.name,
        matchedAreaObj: area,
        matchedCityName: 'Lahore',
        message: `Service Available in ${area.name}`,
      };
    }
  }

  // 2. Fallback check against hardcoded polygon registry
  for (const [areaNameKey, polygon] of Object.entries(AREA_POLYGONS)) {
    if (isPointInPolygon(lat, lng, polygon)) {
      const displayName =
        areaNameKey === 'bahriatown'
          ? 'Bahria Town'
          : areaNameKey === 'modeltown'
          ? 'Model Town'
          : areaNameKey.charAt(0).toUpperCase() + areaNameKey.slice(1);

      const matchedObj = cachedAreas.find(a => normalize(a.name) === areaNameKey);

      return {
        isAvailable: true,
        matchedAreaName: displayName,
        matchedAreaObj: matchedObj,
        matchedCityName: 'Lahore',
        message: `Service Available in ${displayName}`,
      };
    }
  }

  return {
    isAvailable: false,
    message: 'Services Not Available in this area',
  };
};

/**
 * Helper signature for backwards compatibility with existing call sites.
 */
export const validateLocationServiceability = (
  cityInput: string,
  areaInput: string,
  fullAddressInput: string = '',
  latitude?: number,
  longitude?: number
): ServiceabilityResult => {
  if (latitude && longitude) {
    return validateCoordinatesServiceability(latitude, longitude);
  }
  return { isAvailable: false, message: 'Services Not Available in this area' };
};
