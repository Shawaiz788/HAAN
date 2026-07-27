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
 * Real-world geographic boundary polygons for supported housing societies and major areas in Lahore.
 * Each polygon is a closed array of [latitude, longitude] vertices tracing official society borders.
 * Note: Garden Town is intentionally excluded for boundary precision testing.
 */
export const AREA_POLYGONS: Record<string, Array<[number, number]>> = {
  // 1. Bahria Town (Lahore)
  bahriatown: [
    [31.3880, 74.1680], // North West (Canal Road / Sector F)
    [31.3820, 74.1960], // North East (Canal Bank Rd / Sector A)
    [31.3580, 74.2000], // East (Sector E / Sector D boundary)
    [31.3340, 74.1860], // South (Sector F / Golf Course)
    [31.3380, 74.1540], // South West (Sector F West)
    [31.3650, 74.1500], // West (Outer Perimeter)
  ],

  // 2. Model Town (Lahore)
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

  // 3. Gulberg (Lahore)
  gulberg: [
    [31.5320, 74.3320], // North West (Canal Rd / FC College)
    [31.5300, 74.3550], // North East (Canal Rd / Muslim Town bridge side)
    [31.5200, 74.3680], // East (Canal Rd / Main Boulevard East)
    [31.5020, 74.3650], // South East (Cavalry Ground border)
    [31.4850, 74.3550], // South (Walton Rd / Packages Mall area)
    [31.5000, 74.3380], // South West (Kalma Chowk East / Ferozepur Rd)
    [31.5180, 74.3280], // West (Ferozepur Rd / Ichhra border)
  ],

  // 4. DHA Lahore (Defence Housing Authority)
  dha: [
    [31.4980, 74.3720], // North West (DHA Phase 1 / Cantt border)
    [31.5050, 74.4250], // North (DHA Phase 8 / Ring Road)
    [31.4850, 74.4650], // North East (DHA Phase 8 Barki Rd)
    [31.4450, 74.4800], // East (DHA Phase 6 / 7 Ring Rd)
    [31.4200, 74.4450], // South East (DHA Phase 7 / Bedian Rd)
    [31.4250, 74.3950], // South (DHA Phase 5 / Phase 9 Town border)
    [31.4720, 74.3700], // West (DHA Phase 3 / Y Block / Walton Rd)
  ],

  // 5. Johar Town (Lahore)
  johartown: [
    [31.4780, 74.2620], // North West (Canal Rd / Thokar Niaz Baig / Doctor Hospital)
    [31.4900, 74.2980], // North (Canal Rd / Campus bridge)
    [31.4780, 74.3050], // North East (Maulana Shaukat Ali Rd / Faisal Town border)
    [31.4650, 74.3020], // East (Maulana Shaukat Ali Rd / Akbar Chowk)
    [31.4450, 74.2900], // South East (Khayaban-e-Jinnah / Wapda Town border)
    [31.4420, 74.2700], // South West (Khayaban-e-Jinnah / Shaukat Khanum)
    [31.4550, 74.2580], // West (Raiwind Rd / Emporium / UCP)
  ],

  // 6. Faisal Town (Lahore)
  faisaltown: [
    [31.4880, 74.3050], // North (Maulana Shaukat Ali Rd / Barkat Market border)
    [31.4720, 74.3080], // East (Maulana Shaukat Ali Rd / Model Town border)
    [31.4640, 74.3000], // South (Peco Rd / Township border)
    [31.4760, 74.2950], // West (College Rd / Johar Town border)
  ],

  // 7. Wapda Town (Lahore)
  wapdatown: [
    [31.4440, 74.2880], // North (Khayaban-e-Jinnah / Johar Town border)
    [31.4400, 74.3000], // East (College Rd / Township border)
    [31.4220, 74.2900], // South (Valencia / Audit & Accounts border)
    [31.4300, 74.2720], // West (Khayaban-e-Jinnah West)
  ],

  // 8. Allama Iqbal Town (Lahore)
  iqbaltown: [
    [31.5300, 74.2800], // North (Multan Rd / Samanabad border)
    [31.5220, 74.3050], // East (Wahdat Rd / Muslim Town border)
    [31.5000, 74.2950], // South (Wahdat Rd / PU Campus West)
    [31.5120, 74.2680], // West (Multan Rd / Kharak / Shahnoor)
  ],

  // 9. Township (Lahore)
  township: [
    [31.4640, 74.3020], // North (Peco Rd / Faisal Town & Model Town border)
    [31.4620, 74.3280], // East (Model Town Link Rd / Ferozepur Rd)
    [31.4380, 74.3300], // South (Quaid-e-Azam Industrial Estate / Kot Lakhpat)
    [31.4400, 74.3000], // West (College Rd / Wapda Town border)
  ],

  // 10. Lake City (Lahore)
  lakecity: [
    [31.3700, 74.2250], // North (Raiwind Rd / Adda Plot North)
    [31.3650, 74.2480], // East (Sue-e-Asal Rd / Ring Rd)
    [31.3420, 74.2420], // South (Lake City M8 / Ring Rd South)
    [31.3500, 74.2180], // West (Raiwind Rd / Superior Uni)
  ],

  // 11. Askari (Lahore)
  askari: [
    [31.4700, 74.4050], // North (Bedian Rd / Ring Rd interchange)
    [31.4600, 74.4300], // East (Askari 11 Sector B)
    [31.4420, 74.4200], // South (Bedian Rd South)
    [31.4500, 74.3950], // West (DHA Phase 5 border)
  ],

  // 12. Lahore Cantt
  cantt: [
    [31.5450, 74.3650], // North (Mall Rd / Fortress Stadium)
    [31.5350, 74.4050], // East (Airport / Zarar Shaheed Rd)
    [31.4980, 74.3720], // South (Walton Rd / DHA Phase 1)
    [31.5200, 74.3680], // West (Canal Rd / Gulberg border)
  ],
};

export const AREA_DISPLAY_NAMES: Record<string, string> = {
  bahriatown: 'Bahria Town',
  modeltown: 'Model Town',
  gulberg: 'Gulberg',
  dha: 'DHA Lahore',
  johartown: 'Johar Town',
  faisaltown: 'Faisal Town',
  wapdatown: 'Wapda Town',
  iqbaltown: 'Allama Iqbal Town',
  township: 'Township',
  lakecity: 'Lake City',
  askari: 'Askari',
  cantt: 'Lahore Cantt',
};

// Export CITY_POLYGONS as alias for backwards compatibility
export const CITY_POLYGONS = AREA_POLYGONS;

// Default supported areas baseline
const DEFAULT_AREAS: Area[] = [
  { id: 1, name: 'Bahria Town' },
  { id: 2, name: 'Model Town' },
  { id: 3, name: 'Gulberg' },
  { id: 4, name: 'DHA Lahore' },
  { id: 5, name: 'Johar Town' },
  { id: 6, name: 'Faisal Town' },
  { id: 7, name: 'Wapda Town' },
  { id: 8, name: 'Allama Iqbal Town' },
  { id: 9, name: 'Township' },
  { id: 10, name: 'Lake City' },
  { id: 11, name: 'Askari' },
  { id: 12, name: 'Lahore Cantt' },
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
      const displayName = AREA_DISPLAY_NAMES[areaKey] || area.name;
      return {
        isAvailable: true,
        matchedAreaName: displayName,
        matchedAreaObj: area,
        matchedCityName: 'Lahore',
        message: `Service Available in ${displayName}`,
      };
    }
  }

  // 2. Fallback check against hardcoded polygon registry
  for (const [areaNameKey, polygon] of Object.entries(AREA_POLYGONS)) {
    if (isPointInPolygon(lat, lng, polygon)) {
      const displayName = AREA_DISPLAY_NAMES[areaNameKey] || (areaNameKey.charAt(0).toUpperCase() + areaNameKey.slice(1));
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
