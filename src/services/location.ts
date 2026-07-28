import { getCountries, createCountry } from './country';
import { getCities, createCity } from './city';
import { getAreas, createArea } from './area';
import { fetchWithTimeout, API_URL } from './fetchClient';
import { Country, City, Area, UserLocation } from '@/types';
import { logger } from '@/utils/logger';

export { Country, getCountries, createCountry };
export { City, getCities, createCity };
export { Area, getAreas, createArea };
export { UserLocation };

export const createLocation = async (location: UserLocation): Promise<UserLocation> => {
  logger.log('[createLocation API] Sending payload:', JSON.stringify(location, null, 2));
  const response = await fetchWithTimeout(`${API_URL}/app/location/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(location),
  });

  const responseText = await response.text();
  logger.log('[createLocation API] Response Status:', response.status);
  logger.log('[createLocation API] Response Body:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to create location. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse location response as JSON. Content: ${responseText}`);
  }
};

export const getLocationById = async (id: number): Promise<UserLocation> => {
  // console.log(`[getLocationById API] Fetching location details for ID: ${id}`);
  const response = await fetchWithTimeout(`${API_URL}/app/location/${id}/`);
  const responseText = await response.text();
  // console.log('[getLocationById API] Response Status:', response.status);
  //console.log('[getLocationById API] Response Body:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to fetch location by ID. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse location response as JSON. Content: ${responseText}`);
  }
};

export interface LocationChainInput {
  countryName: string;
  cityName: string;
  areaName: string;
  /** Pre-resolved IDs from the UI state. When provided, API lookups are fast-tracked. */
  resolvedCountryId?: number;
  resolvedCityId?: number;
  resolvedAreaId?: number;
  houseNumber: string;
  streetNumber: string;
  latitude: number;
  longitude: number;
  zipCode: string;
  formatted_address?: string;
}

export const getOrCreateLocationChain = async (input: LocationChainInput): Promise<UserLocation> => {
  const { countryName, cityName, areaName, houseNumber, streetNumber, latitude, longitude, zipCode, formatted_address } = input;
  logger.log('[LocationChain] Starting resolution for:', input);

  // ── Fast path: city and area IDs already known from the UI ──────────────────
  if (input.resolvedCityId && input.resolvedAreaId) {
    logger.log('[LocationChain] Using pre-resolved city/area IDs — resolving countryId...');
    
    let countryId = input.resolvedCountryId;
    if (!countryId) {
      try {
        const countries = await getCountries();
        const existingCountry = (countries || []).find(
          (c) => c.name.toLowerCase() === (countryName || 'pakistan').toLowerCase()
        );
        countryId = existingCountry ? existingCountry.id : (countries && countries[0] ? countries[0].id : 1);
      } catch (e) {
        console.warn('[LocationChain] Failed to fetch countries for fast path, defaulting to ID 1:', e);
        countryId = 1;
      }
    }

    logger.log(`[LocationChain] Fast path IDs: countryId=${countryId}, cityId=${input.resolvedCityId}, areaId=${input.resolvedAreaId}`);

    const cleanLat = latitude ? Number(latitude.toFixed(6)) : undefined;
    const cleanLng = longitude ? Number(longitude.toFixed(6)) : undefined;

    const locationPayload: UserLocation = {
      country_id: countryId,
      city_id: input.resolvedCityId,
      area_id: input.resolvedAreaId,
      house_number: houseNumber ? Number(houseNumber) : undefined,
      street_number: streetNumber,
      latitude: cleanLat,
      longitude: cleanLng,
      zip_code: zipCode ? Number(zipCode) : undefined,
      formatted_address,
    };

    logger.log('[LocationChain] Fast-path location payload:', locationPayload);
    return await createLocation(locationPayload);
  }

  // ── Slow path: resolve IDs from API ─────────────────────────────────────────
  // Fetch all reference data in parallel — they are independent of each other
  const [countries, cities, areas] = await Promise.all([
    getCountries(),
    getCities(),
    getAreas(),
  ]);

  const safeCountries = Array.isArray(countries) ? countries : [];
  const safeCities = Array.isArray(cities) ? cities : [];
  const safeAreas = Array.isArray(areas) ? areas : [];

  logger.log(`[LocationChain] Loaded ${safeCountries.length} countries, ${safeCities.length} cities, ${safeAreas.length} areas`);

  // 1. Resolve Country
  let countryId: number;
  const existingCountry = safeCountries.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  if (existingCountry) {
    countryId = existingCountry.id;
    console.log('[LocationChain] Country exists with ID:', countryId);
  } else {
    console.log('[LocationChain] Country does not exist, creating:', countryName);
    const newCountry = await createCountry(countryName);
    countryId = newCountry.id;
    console.log('[LocationChain] Country created with ID:', countryId);
  }

  // 2. Resolve City
  let cityId: number;
  const existingCity = safeCities.find(
    (c: any) => {
      const matchName = c.name.toLowerCase() === cityName.toLowerCase();
      if (!matchName) return false;
      // c.country can be a plain number ID or an object
      const cId =
        c.country === null || c.country === undefined
          ? null
          : typeof c.country === 'object'
            ? c.country?.id
            : c.country; // plain number
      return !cId || cId === countryId;
    }
  );
  if (existingCity) {
    cityId = existingCity.id;
    console.log('[LocationChain] City exists with ID:', cityId);
  } else {
    console.log('[LocationChain] City does not exist, creating:', cityName);
    const newCity = await createCity(countryId, cityName);
    cityId = newCity.id;
    console.log('[LocationChain] City created with ID:', cityId);
  }

  // 3. Resolve Area
  let areaId: number;
  const existingArea = safeAreas.find(
    (a: any) => {
      const matchName = a.name.toLowerCase() === areaName.toLowerCase();
      if (!matchName) return false;
      // a.city can be a plain number ID or an object
      const cId =
        a.city === null || a.city === undefined
          ? null
          : typeof a.city === 'object'
            ? a.city?.id
            : a.city; // plain number
      return !cId || cId === cityId;
    }
  );
  if (existingArea) {
    areaId = existingArea.id;
    console.log('[LocationChain] Area exists with ID:', areaId);
  } else {
    console.log('[LocationChain] Area does not exist, creating:', areaName);
    const newArea = await createArea(cityId, areaName);
    areaId = newArea.id;
    console.log('[LocationChain] Area created with ID:', areaId);
  }

  // 4. Create User Location
  const cleanLat = latitude ? Number(latitude.toFixed(6)) : undefined;
  const cleanLng = longitude ? Number(longitude.toFixed(6)) : undefined;

  const locationPayload: UserLocation = {
    country_id: countryId,
    city_id: cityId,
    area_id: areaId,
    house_number: houseNumber ? Number(houseNumber) : undefined,
    street_number: streetNumber,
    latitude: cleanLat,
    longitude: cleanLng,
    zip_code: zipCode ? Number(zipCode) : undefined,
    formatted_address,
  };

  console.log('[LocationChain] Creating Location with payload:', locationPayload);
  return await createLocation(locationPayload);
};