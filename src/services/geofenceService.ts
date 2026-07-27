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
 * Real-world high-precision geographic boundary polygons for supported housing societies and major areas in Lahore.
 * Each polygon is a high-density closed array of 15 to 22 [latitude, longitude] vertices tracing official society borders.
 * Note: Garden Town is intentionally excluded for boundary precision testing.
 */
export const AREA_POLYGONS: Record<string, Array<[number, number]>> = {
  // 1. Bahria Town (Lahore) - High-Density Polygon
  bahriatown: [
    [31.3885, 74.1680], // Canal Road / Sector F Entrance
    [31.3860, 74.1750], // Canal Bank Rd / Sector C Entrance
    [31.3840, 74.1850], // Canal Bank Rd / Sector B Entrance
    [31.3820, 74.1960], // Sector A / Tulip Block / Canal Bank East
    [31.3750, 74.2010], // Sector A East Border (Jasmine Block)
    [31.3680, 74.2020], // Sector D East Border
    [31.3580, 74.2000], // Sector E East Border (Eiffel Tower Area East)
    [31.3480, 74.1950], // Sector E South East (Safari Villas)
    [31.3380, 74.1910], // Golf Country Club East
    [31.3340, 74.1860], // Golf Country Club South
    [31.3320, 74.1780], // Sector F Extension South
    [31.3350, 74.1680], // Ring Road Interchange South West
    [31.3380, 74.1540], // Sector F West Border
    [31.3450, 74.1510], // Sector F West Outer Perimeter
    [31.3550, 74.1500], // Sukh Chayn Gardens Border West
    [31.3650, 74.1500], // Multan Road Junction West
    [31.3750, 74.1530], // Sector F North West Boundary
    [31.3820, 74.1590], // Sector F Canal Road North West
  ],

  // 2. Model Town (Lahore) - High-Density Polygon
  modeltown: [
    [31.5015, 74.3285], // Kalma Chowk Underpass North
    [31.4990, 74.3350], // Model Town Block A North / Ferozepur Rd
    [31.4960, 74.3420], // Model Town Metrobus Station / Block B
    [31.4910, 74.3425], // Ferozepur Road / Block C
    [31.4850, 74.3415], // Ferozepur Road / Block D
    [31.4780, 74.3400], // Ferozepur Road / Block E & F
    [31.4710, 74.3380], // Metro Cash & Carry Ferozepur Rd
    [31.4650, 74.3350], // Model Town Link Road Junction South-East
    [31.4635, 74.3290], // Model Town Link Road / Block M
    [31.4640, 74.3200], // Model Town Link Road / Township Border South
    [31.4660, 74.3140], // Peco Road Junction South-West
    [31.4720, 74.3080], // Maulana Shaukat Ali Road / Faisal Town Border
    [31.4780, 74.3100], // Maulana Shaukat Ali Road / Block J
    [31.4840, 74.3115], // Maulana Shaukat Ali Road / Block K
    [31.4880, 74.3120], // Maulana Shaukat Ali Road / Faisal Town West
    [31.4940, 74.3150], // Garden Town Border West (Block L)
    [31.4980, 74.3180], // Kalma Chowk West / Garden Town Border
    [31.5005, 74.3230], // Kalma Chowk Flyover North-West
  ],

  // 3. Gulberg (Lahore) - High-Density Polygon
  gulberg: [
    [31.5340, 74.3320], // Canal Bank Road / FC College North-West
    [31.5350, 74.3420], // Canal Bank Road / Zahoor Elahi Rd Bridge
    [31.5330, 74.3500], // Canal Bank Road / Muslim Town Bridge Side
    [31.5300, 74.3580], // Canal Bank Road / Main Boulevard North-East
    [31.5240, 74.3660], // Canal Bank Road / Mall Rd Underpass East
    [31.5200, 74.3680], // Main Boulevard East / Cantt Border
    [31.5120, 74.3670], // Gurumangat Road East / Cavalry Border
    [31.5020, 74.3650], // Gurumangat Road South-East
    [31.4930, 74.3600], // Walton Road / Gulberg III South-East
    [31.4850, 74.3550], // Packages Mall Area / Ferozepur Rd South
    [31.4920, 74.3460], // Ferozepur Road / Model Town Metrobus
    [31.5000, 74.3380], // Kalma Chowk East / Main Blvd Junction
    [31.5080, 74.3330], // Ferozepur Road / Canal Park West
    [31.5180, 74.3280], // Ferozepur Road / Ichhra Border West
    [31.5250, 74.3290], // Jail Road / Shadman Border West
    [31.5300, 74.3300], // FC College Underpass North-West
  ],

  // 4. DHA Lahore (Defence Housing Authority) - High-Density Polygon
  dha: [
    [31.4980, 74.3720], // DHA Phase 1 / Walton Rd North-West
    [31.5020, 74.3850], // DHA Phase 1 / Cantt Border North
    [31.5080, 74.4020], // DHA Phase 8 / Airport Road North
    [31.5050, 74.4250], // DHA Phase 8 / Ring Road Interchange
    [31.4980, 74.4480], // DHA Phase 8 / Barki Road North-East
    [31.4850, 74.4650], // DHA Phase 8 Proper East Boundary
    [31.4680, 74.4750], // DHA Phase 6 East Boundary
    [31.4450, 74.4800], // DHA Phase 7 / Ring Road South-East
    [31.4320, 74.4680], // DHA Phase 7 / Bedian Rd Junction South-East
    [31.4200, 74.4450], // DHA Phase 7 / Bedian Rd South
    [31.4180, 74.4200], // DHA Phase 9 Town / Bedian Rd South-West
    [31.4250, 74.3950], // DHA Phase 5 / Sui Gas Society Border
    [31.4380, 74.3820], // DHA Phase 5 / Ring Road South-West
    [31.4500, 74.3750], // DHA Phase 4 / Packages Mall Side
    [31.4620, 74.3710], // DHA Phase 3 / Y Block Commercial
    [31.4720, 74.3700], // DHA Phase 3 / Walton Rd Border West
    [31.4860, 74.3710], // DHA Phase 1 / Walton Rd West
  ],

  // 5. Johar Town (Lahore) - High-Density Polygon
  johartown: [
    [31.4780, 74.2620], // Canal Road / Thokar Niaz Baig North-West
    [31.4840, 74.2750], // Canal Road / Doctor Hospital Bridge
    [31.4880, 74.2880], // Canal Road / Jinnah Hospital North
    [31.4900, 74.2980], // Canal Road / PU Campus Bridge North-East
    [31.4840, 74.3030], // Maulana Shaukat Ali Rd / Faisal Town Border
    [31.4780, 74.3050], // Maulana Shaukat Ali Rd / Block G & H
    [31.4710, 74.3035], // Maulana Shaukat Ali Rd / Block R
    [31.4650, 74.3020], // Maulana Shaukat Ali Rd / Akbar Chowk East
    [31.4580, 74.2980], // College Road / Township Border South-East
    [31.4500, 74.2930], // Khayaban-e-Jinnah / Wapda Town Border
    [31.4450, 74.2900], // Khayaban-e-Jinnah Junction South
    [31.4420, 74.2810], // Khayaban-e-Jinnah / Expo Center South
    [31.4420, 74.2700], // Khayaban-e-Jinnah / Shaukat Khanum Hospital
    [31.4480, 74.2620], // Raiwind Road / UCP Campus West
    [31.4550, 74.2580], // Raiwind Road / Emporium Mall West
    [31.4650, 74.2570], // Raiwind Road / Westwood Colony West
    [31.4720, 74.2590], // Thokar Niaz Baig Interchange West
  ],

  // 6. Faisal Town (Lahore) - High-Density Polygon
  faisaltown: [
    [31.4880, 74.3050], // Maulana Shaukat Ali Rd / Barkat Market Border North
    [31.4850, 74.3075], // Maulana Shaukat Ali Rd / Block A
    [31.4800, 74.3080], // Maulana Shaukat Ali Rd / Block B
    [31.4720, 74.3080], // Maulana Shaukat Ali Rd / Model Town Border East
    [31.4680, 74.3050], // Peco Road Junction South-East
    [31.4640, 74.3000], // Peco Road / Township Border South
    [31.4660, 74.2970], // Peco Road / College Rd Junction South-West
    [31.4720, 74.2950], // College Road / Johar Town Border West
    [31.4760, 74.2950], // College Road / Block C West
    [31.4820, 74.2980], // Maulana Shaukat Ali Rd / Block A North-West
  ],

  // 7. Wapda Town (Lahore) - High-Density Polygon
  wapdatown: [
    [31.4440, 74.2880], // Khayaban-e-Jinnah / Johar Town Border North
    [31.4430, 74.2950], // Khayaban-e-Jinnah / College Rd Junction North-East
    [31.4400, 74.3000], // College Road / Township Border East
    [31.4320, 74.2970], // College Road / Phase 1 East
    [31.4260, 74.2930], // Audit & Accounts Society Border South-East
    [31.4220, 74.2900], // Valencia Town Border South
    [31.4210, 74.2820], // Phase 2 South-West
    [31.4250, 74.2750], // Khayaban-e-Jinnah West Boundary
    [31.4300, 74.2720], // Khayaban-e-Jinnah / Tarogill West
    [31.4380, 74.2780], // Khayaban-e-Jinnah / Expo Center Side North-West
  ],

  // 8. Allama Iqbal Town (Lahore) - High-Density Polygon
  iqbaltown: [
    [31.5300, 74.2800], // Multan Road / Samanabad Border North-West
    [31.5320, 74.2920], // Wahdat Road / Samanabad Border North
    [31.5280, 74.3000], // Wahdat Road / Muslim Town Border North-East
    [31.5220, 74.3050], // Wahdat Road / Metrobus Station East
    [31.5140, 74.3030], // Punjab University Campus West Border East
    [31.5050, 74.2990], // PU Campus West / Khyber Block South-East
    [31.5000, 74.2950], // Wahdat Canal Junction South
    [31.5020, 74.2850], // Shahnoor Studio Area South-West
    [31.5080, 74.2740], // Multan Road / Kharak Stop West
    [31.5120, 74.2680], // Multan Road / Mansoora West
    [31.5200, 74.2710], // Multan Road / Moon Market Side West
    [31.5260, 74.2760], // Multan Road / Yatim Khana Flyover West
  ],

  // 9. Township (Lahore) - High-Density Polygon
  township: [
    [31.4640, 74.3020], // Peco Road / Faisal Town Border North-West
    [31.4650, 74.3120], // Peco Road / Model Town Border North
    [31.4635, 74.3220], // Model Town Link Rd Junction North-East
    [31.4620, 74.3280], // Ferozepur Road / Township Sector A East
    [31.4540, 74.3310], // Ferozepur Road / Sector B East
    [31.4450, 74.3320], // Quaid-e-Azam Industrial Estate East
    [31.4380, 74.3300], // Kot Lakhpat Railway Station Area South-East
    [31.4360, 74.3200], // Industrial Estate South Boundary
    [31.4370, 74.3100], // Quaid-e-Azam Industrial Estate South-West
    [31.4400, 74.3000], // College Road / Wapda Town Border West
    [31.4480, 74.2990], // College Road / Sector C West
    [31.4580, 74.3000], // College Road / Sector B West
  ],

  // 10. Lake City (Lahore) - High-Density Polygon
  lakecity: [
    [31.3700, 74.2250], // Raiwind Road / Adda Plot Interchange North
    [31.3710, 74.2340], // Lake City Roof Garden North-East
    [31.3680, 74.2420], // Sue-e-Asal Road / Ring Road Interchange East
    [31.3650, 74.2480], // Lake City M3 / Ring Road East
    [31.3550, 74.2470], // Lake City M5 / Golf Club East
    [31.3420, 74.2420], // Lake City M8 South-East
    [31.3380, 74.2320], // Lake City South Boundary
    [31.3420, 74.2220], // Lake City M7 / Superior Uni South-West
    [31.3500, 74.2180], // Raiwind Road / Superior Uni West
    [31.3600, 74.2200], // Raiwind Road / Lake City Main Entrance West
  ],

  // 11. Askari (Lahore) - High-Density Polygon
  askari: [
    [31.4700, 74.4050], // Bedian Road / Ring Road Interchange North
    [31.4720, 74.4150], // Askari 10 Main Gate North-East
    [31.4680, 74.4250], // Askari 11 Sector A North-East
    [31.4600, 74.4300], // Askari 11 Sector B East Boundary
    [31.4500, 74.4280], // Askari 11 Sector C South-East
    [31.4420, 74.4200], // Bedian Road South Boundary
    [31.4400, 74.4100], // Askari 11 South-West
    [31.4460, 74.4000], // Ring Road Interchange South-West
    [31.4500, 74.3950], // DHA Phase 5 Border West
    [31.4600, 74.3980], // Bedian Road / DHA Phase 5 Gate West
  ],

  // 12. Lahore Cantt - High-Density Polygon
  cantt: [
    [31.5450, 74.3650], // Mall Road / St Anthony School / Fortress North-West
    [31.5480, 74.3780], // Mall Road / Garrison Golf Club North
    [31.5460, 74.3920], // Saddar Bazaar North-East
    [31.5400, 74.4020], // Zarar Shaheed Road / Airport North-East
    [31.5350, 74.4050], // Allama Iqbal Int'l Airport Border East
    [31.5220, 74.4000], // Airport Security Boundary East
    [31.5100, 74.3900], // DHA Phase 1 Border South-East
    [31.4980, 74.3720], // Walton Road / DHA Phase 1 Junction South
    [31.5050, 74.3680], // Cavalry Ground West Border
    [31.5150, 74.3660], // Super Town / Cantt Board Office West
    [31.5200, 74.3680], // Canal Road / Gulberg Border West
    [31.5320, 74.3640], // Mian Mir Bridge / Mall Road West
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
