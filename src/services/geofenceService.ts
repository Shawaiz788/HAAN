import { getCities, City } from './city';
import { getAreas, Area } from './area';

export interface ServiceabilityResult {
  isAvailable: boolean;
  cityMatch?: City;
  areaMatch?: Area;
  message: string;
}

// Default supported cities as baseline fallback
const DEFAULT_CITIES: City[] = [
  { id: 1, name: 'Lahore' },
  { id: 2, name: 'Islamabad' },
  { id: 3, name: 'Rawalpindi' },

];

let cachedCities: City[] = [...DEFAULT_CITIES];
let cachedAreas: Area[] = [];
let isInitialized = false;

function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(city|district|tehsil|subregion|division|pakistan|cavalry)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const initializeGeofenceService = async (): Promise<void> => {
  try {
    const [cities, areas] = await Promise.all([
      getCities().catch(() => []),
      getAreas().catch(() => []),
    ]);

    if (cities && cities.length > 0) {
      const existingNames = new Set(cities.map((c) => normalize(c.name)));
      const extraDefaults = DEFAULT_CITIES.filter((dc) => !existingNames.has(normalize(dc.name)));
      cachedCities = [...cities, ...extraDefaults];
    }
    if (areas && areas.length > 0) {
      cachedAreas = areas;
    }
    isInitialized = true;
  } catch (error) {
    console.log('[geofenceService] Using default supported cities fallback.');
  }
};

export const getCachedCitiesAndAreas = () => {
  return { cities: cachedCities, areas: cachedAreas };
};

export const validateLocationServiceability = (
  cityInput: string,
  areaInput: string,
  fullAddressInput: string = ''
): ServiceabilityResult => {
  const normCity = normalize(cityInput);
  const normArea = normalize(areaInput);
  const normAddress = normalize(fullAddressInput);

  // 1. Check City match
  let matchedCity: City | undefined;
  if (cachedCities.length > 0) {
    matchedCity = cachedCities.find((c) => {
      const cNorm = normalize(c.name);
      if (!cNorm || cNorm.length < 3) return false;

      const cityMatch = normCity.length >= 3 && (normCity.includes(cNorm) || cNorm.includes(normCity));
      const addressMatch = normAddress.length >= 3 && normAddress.includes(cNorm);

      return cityMatch || addressMatch;
    });
  }

  // 2. Check Area match
  let matchedArea: Area | undefined;
  if (cachedAreas.length > 0) {
    matchedArea = cachedAreas.find((a) => {
      const aNorm = normalize(a.name);
      if (!aNorm || aNorm.length < 3) return false;

      const areaMatch = normArea.length >= 3 && (normArea.includes(aNorm) || aNorm.includes(normArea));
      const addressMatch = normAddress.length >= 3 && normAddress.includes(aNorm);

      return areaMatch || addressMatch;
    });
  }

  // If city is matched or area is matched
  if (matchedCity || matchedArea) {
    return {
      isAvailable: true,
      cityMatch: matchedCity,
      areaMatch: matchedArea,
      message: 'Service Available',
    };
  }

  // Otherwise unavailable
  return {
    isAvailable: false,
    message: 'Services Not Available',
  };
};
