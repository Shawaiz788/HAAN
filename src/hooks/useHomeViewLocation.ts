import { useState, useEffect, useRef } from 'react';
import { Alert, Keyboard, Platform, ToastAndroid } from 'react-native';
import * as Location from 'expo-location';
import { getLocationById } from '@/services/location';
import { getCachedLocation, setCachedLocation, CachedLocation } from '@/utils/locationCache';
import { initializeGeofenceService, validateCoordinatesServiceability } from '@/services/geofenceService';

interface UseHomeViewLocationProps {
  user: any;
  webViewRef: React.RefObject<any>;
}

export function useHomeViewLocation({ user, webViewRef }: UseHomeViewLocationProps) {
  const cached = getCachedLocation(user?.id);

  const [mapCoords, setMapCoords] = useState({
    latitude: cached.latitude,
    longitude: cached.longitude,
  });
  const [initialCoords, setInitialCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: cached.latitude,
    longitude: cached.longitude,
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [address, setAddress] = useState(cached.address || 'Lahore, Pakistan');
  const [isLocationAvailable, setIsLocationAvailable] = useState(true);
  const [unavailabilityReason, setUnavailabilityReason] = useState('');

  useEffect(() => {
    initializeGeofenceService();
  }, []);

  // Search & Adjust Location States
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [pinAdjusterVisible, setPinAdjusterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Bottom sheet direct location fields (when expanded)
  const [locStreet, setLocStreet] = useState(cached.street || '');
  const [locArea, setLocArea] = useState(cached.area || '');
  const [locCity, setLocCity] = useState(cached.city || '');
  const [locSearchLoading, setLocSearchLoading] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      let response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const item = response[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city,
        ].filter(Boolean);
        const resolvedAddress = parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const streetVal = item.street || item.name || '';
        const areaVal = item.district || item.subregion || '';
        const cityVal = item.city || '';

        setAddress(resolvedAddress);
        setLocStreet(streetVal);
        setLocArea(areaVal);
        setLocCity(cityVal);

        // Real-World Polygon Geofence Validation
        const result = validateCoordinatesServiceability(lat, lng);
        setIsLocationAvailable(result.isAvailable);
        setUnavailabilityReason(result.message);

        // Persist to MMKV
        setCachedLocation({
          latitude: lat,
          longitude: lng,
          address: resolvedAddress,
          street: streetVal,
          area: areaVal,
          city: cityVal,
        }, user?.id);
      } else {
        const fallbackAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(fallbackAddr);
        setIsLocationAvailable(false);
        setUnavailabilityReason('Services Not Available Here');
        setCachedLocation({ latitude: lat, longitude: lng, address: fallbackAddr }, user?.id);
      }
    } catch (e) {
      const fallbackAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallbackAddr);
      setIsLocationAvailable(true);
      setCachedLocation({ latitude: lat, longitude: lng, address: fallbackAddr }, user?.id);
    }
  };

  const reCenterMap = async () => {
    setIsGeocoding(true);
    try {
      let loc = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);
      } catch (e) {
        console.log('[HomeView] Re-center GPS request timed out or failed. Fetching cached position as fallback...');
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc) {
        throw new Error('Re-center failed to fetch location.');
      }

      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setMapCoords(newCoords);

      if (webViewRef.current) {
        const jsCode = `
          if (typeof map !== 'undefined' && map) {
            var targetLatLng = L.latLng(${newCoords.latitude}, ${newCoords.longitude});
            var targetPoint = map.project(targetLatLng, 15);
            var size = map.getSize();
            var offset = L.point(0, size.y * (0.5 - 0.35));
            var centerPoint = targetPoint.add(offset);
            var centerLatLng = map.unproject(centerPoint, 15);
            map.setView(centerLatLng, 15);
          }
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
      }
      await reverseGeocode(newCoords.latitude, newCoords.longitude);
    } catch (err) {
      Alert.alert('Location Error', 'Unable to fetch current location.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const searchDebounceRef = useRef<any>(null);

  const formatSearchResult = (item: any) => {
    const addr = item.address || {};
    const parts = item.display_name.split(',').map((s: string) => s.trim());

    // Determine primary title
    let title =
      addr.amenity ||
      addr.building ||
      addr.shop ||
      addr.office ||
      addr.tourism ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.road ||
      parts[0] ||
      'Location';

    // Build clean subtitle (exclude country & zipcode)
    const subtitleParts: string[] = [];
    if (addr.road && addr.road !== title) subtitleParts.push(addr.road);
    if (addr.suburb && addr.suburb !== title) subtitleParts.push(addr.suburb);
    if (addr.neighbourhood && addr.neighbourhood !== title) subtitleParts.push(addr.neighbourhood);
    if (addr.city || addr.town || addr.county) subtitleParts.push(addr.city || addr.town || addr.county);
    if (addr.state && !subtitleParts.includes(addr.state)) subtitleParts.push(addr.state);

    let cleanSubtitle = subtitleParts.join(', ');
    if (!cleanSubtitle) {
      cleanSubtitle = parts
        .filter((p: string) => p !== title && !/^\d{5}$/.test(p) && p.toLowerCase() !== 'pakistan')
        .slice(0, 3)
        .join(', ');
    }

    return {
      id: String(item.place_id),
      name: title,
      address: cleanSubtitle || item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type || item.class || 'location',
    };
  };

  const searchLocations = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchingLocation(false);
      return;
    }

    setSearchingLocation(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        let viewboxParam = '';
        if (mapCoords?.latitude && mapCoords?.longitude) {
          const lat = mapCoords.latitude;
          const lng = mapCoords.longitude;
          viewboxParam = `&viewbox=${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}`;
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&countrycodes=pk&addressdetails=1${viewboxParam}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'KaamKrwaoApp/1.0',
            },
          }
        );
        const data = await response.json();
        if (data && Array.isArray(data)) {
          const formatted = data.map(formatSearchResult);
          setSearchResults(formatted);
        }
      } catch (error) {
        console.error('Search location error: ', error);
      } finally {
        setSearchingLocation(false);
      }
    }, 300);
  };

  const openSearchModal = () => {
    const defaultPlaceholder = 'Fetching location...';
    if (address && address !== defaultPlaceholder) {
      setSearchQuery(address);
      searchLocations(address);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
    setSearchModalVisible(true);
  };

  const selectSearchResult = (item: any) => {
    const newCoords = {
      latitude: item.latitude,
      longitude: item.longitude,
    };
    setMapCoords(newCoords);
    if (!initialCoords) {
      setInitialCoords(newCoords);
    } else {
      if (webViewRef.current) {
        const jsCode = `
          if (map) {
            var targetLatLng = L.latLng(${newCoords.latitude}, ${newCoords.longitude});
            var targetPoint = map.project(targetLatLng, 15);
            var size = map.getSize();
            var offset = L.point(0, size.y * (0.5 - 0.35));
            var centerPoint = targetPoint.add(offset);
            var centerLatLng = map.unproject(centerPoint, 15);
            map.setView(centerLatLng, 15);
          }
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
      }
    }
    setAddress(item.address);
    setSearchModalVisible(false);
  };

  const confirmAdjustedLocation = (coords: { latitude: number; longitude: number }, addressStr: string) => {
    setMapCoords(coords);
    if (webViewRef.current) {
      const jsCode = `
        if (map) {
          var targetLatLng = L.latLng(${coords.latitude}, ${coords.longitude});
          var targetPoint = map.project(targetLatLng, 15);
          var size = map.getSize();
          var offset = L.point(0, size.y * (0.5 - 0.35));
          var centerPoint = targetPoint.add(offset);
          var centerLatLng = map.unproject(centerPoint, 15);
          map.setView(centerLatLng, 15);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
    setAddress(addressStr);
    setPinAdjusterVisible(false);
    setSearchModalVisible(false);
  };

  const updateMapFromFields = async () => {
    const queryParts = [locStreet, locArea, locCity].filter(Boolean);
    if (queryParts.length === 0) {
      Alert.alert('Empty Location', 'Please enter at least one location field.');
      return;
    }
    const query = queryParts.join(', ');
    setLocSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=pk&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'KaamKrwaoApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newCoords = {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
        setMapCoords(newCoords);
        if (webViewRef.current) {
          const jsCode = `
            if (map) {
              var targetLatLng = L.latLng(${newCoords.latitude}, ${newCoords.longitude});
              var targetPoint = map.project(targetLatLng, 15);
              var size = map.getSize();
              var offset = L.point(0, size.y * (0.5 - 0.35));
              var centerPoint = targetPoint.add(offset);
              var centerLatLng = map.unproject(centerPoint, 15);
              map.setView(centerLatLng, 15);
            }
            true;
          `;
          webViewRef.current.injectJavaScript(jsCode);
        }
        setAddress(item.display_name);

        const addr = item.address;
        if (addr) {
          setLocStreet(addr.road || addr.suburb || locStreet);
          setLocArea(addr.neighbourhood || addr.subregion || locArea);
          setLocCity(addr.city || addr.town || addr.county || locCity);
        }
        Keyboard.dismiss();
      } else {
        Alert.alert('Not Found', 'Could not locate this address on the map. Try checking the spelling.');
      }
    } catch (error) {
      console.error('Update map from fields error: ', error);
      Alert.alert('Error', 'Unable to search for this location. Please check your network.');
    } finally {
      setLocSearchLoading(false);
    }
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'REGION_CHANGED') {
        setMapCoords({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        reverseGeocode(data.latitude, data.longitude);
      }
    } catch (e) {
      // JSON parse error
    }
  };

  return {
    mapCoords,
    setMapCoords,
    initialCoords,
    setInitialCoords,
    loadingLocation,
    setLoadingLocation,
    isGeocoding,
    address,
    setAddress,
    searchModalVisible,
    setSearchModalVisible,
    pinAdjusterVisible,
    setPinAdjusterVisible,
    searchQuery,
    searchResults,
    searchingLocation,
    locStreet,
    setLocStreet,
    locArea,
    setLocArea,
    locCity,
    setLocCity,
    isLocationAvailable,
    setIsLocationAvailable,
    unavailabilityReason,
    locSearchLoading,
    reverseGeocode,
    reCenterMap,
    searchLocations,
    openSearchModal,
    selectSearchResult,
    confirmAdjustedLocation,
    updateMapFromFields,
    handleMapMessage,
  };
}
