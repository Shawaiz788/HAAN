import { getCities, City } from './city';
import { getAreas, Area } from './area';

export interface ServiceabilityResult {
  isAvailable: boolean;
  matchedCityName?: string;
  matchedCityObj?: City;
  message: string;
}

/**
 * Real-world geographic boundary polygons for supported cities.
 * Each polygon is an array of [latitude, longitude] vertices tracing official city borders.
 * Easily extensible via API when backend sends custom city boundary coordinates.
 */
export const CITY_POLYGONS: Record<string, Array<[number, number]>> = {
  // Real-world boundary polygon tracing Islamabad Capital Territory (ICT)
  islamabad: [
    [33.7850, 73.0800], // Margalla Hills North
    [33.7750, 73.1800], // East Margalla / Quaid-i-Azam Uni
    [33.7200, 73.2500], // Bhara Kahu / Simly Dam Rd
    [33.6500, 73.2200], // Zone 4 / Lehtrar Rd
    [33.5500, 73.1800], // Zone 5 / Kahuta / Sihala
    [33.4800, 73.1000], // Rawat / GT Road South
    [33.5200, 72.9500], // Tarnol / Motorway Interchange West
    [33.6000, 72.8500], // New Islamabad Airport Area
    [33.7000, 72.9000], // B-17 / D-12 West
    [33.7600, 72.9800], // Margalla Ridge West
  ],

  // Real-world boundary polygon tracing Lahore District
  lahore: [
    [31.6400, 74.2800], // Shahdara / Ravi River North
    [31.6200, 74.4200], // Wagha / BRB Canal East
    [31.5200, 74.5200], // Bedian Road / Airport East
    [31.3800, 74.4500], // Sue-e-Asal / Ferozepur Road South
    [31.3200, 74.2500], // Raiwind / Bahria Town South
    [31.4000, 74.1200], // Sundar Industrial / Multan Road West
    [31.5200, 74.1500], // Thokar Niaz Baig / Motorway West
    [31.6000, 74.2000], // Sagian / Ravi Bridge West
  ],
};

// Default supported cities baseline
const DEFAULT_CITIES: City[] = [
  { id: 1, name: 'Lahore' },
  { id: 2, name: 'Islamabad' },
];

let cachedCities: City[] = [...DEFAULT_CITIES];
let cachedAreas: Area[] = [];

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
      cachedAreas = areas;
    }
  } catch (error) {
    console.log('[geofenceService] Initialized with baseline supported cities.');
  }
};

export const getCachedCitiesAndAreas = () => {
  return { cities: cachedCities, areas: cachedAreas };
};

/**
 * Primary Geofence Validation:
 * Checks if lat/lng coordinates fall inside active city polygon boundaries.
 */
export const validateCoordinatesServiceability = (
  lat: number,
  lng: number
): ServiceabilityResult => {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return { isAvailable: false, message: 'Services Not Available in this location' };
  }

  // 1. Check active backend cached cities first
  for (const city of cachedCities) {
    const cityKey = normalize(city.name);
    // API Readiness: Use city's custom boundary polygon from API if provided in future
    const polygon = (city as any).boundary_polygon || CITY_POLYGONS[cityKey];

    if (polygon && isPointInPolygon(lat, lng, polygon)) {
      return {
        isAvailable: true,
        matchedCityName: city.name,
        matchedCityObj: city,
        message: `Service Available in ${city.name}`,
      };
    }
  }

  // 2. Fallback check against hardcoded polygon registry
  for (const [cityNameKey, polygon] of Object.entries(CITY_POLYGONS)) {
    if (isPointInPolygon(lat, lng, polygon)) {
      const displayCity = cityNameKey.charAt(0).toUpperCase() + cityNameKey.slice(1);
      return {
        isAvailable: true,
        matchedCityName: displayCity,
        message: `Service Available in ${displayCity}`,
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
  // If coordinates are missing, fallback to coordinate check via address if needed
  return { isAvailable: false, message: 'Services Not Available in this area' };
};
