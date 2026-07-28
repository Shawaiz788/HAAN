import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { logger } from '@/utils/logger';
import { getLocationById } from '@/services/location';
import { useAuth } from '@/context/auth';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Custom hook to manage real-time background/foreground device location
 * for professionals. Falls back to user profile location if permission denied.
 */
export function useProLiveLocation() {
  const { user } = useAuth();
  const [proLocation, setProLocation] = useState<LocationCoords | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (status !== 'granted') {
          logger.warn('[useProLiveLocation] Foreground location permission denied. Falling back to profile location.');
          setHasPermission(false);
          await loadFallbackProfileLocation();
          return;
        }

        setHasPermission(true);

        // Fetch immediate current location
        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted && currentLoc?.coords) {
          setProLocation({
            latitude: currentLoc.coords.latitude,
            longitude: currentLoc.coords.longitude,
          });
          logger.log('[useProLiveLocation] Current live coordinates:', currentLoc.coords.latitude, currentLoc.coords.longitude);
        }

        // Start watching position updates
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 15,
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              setProLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            }
          }
        );
      } catch (err) {
        logger.warn('[useProLiveLocation] Failed to fetch device location:', err);
        if (isMounted) {
          setHasPermission(false);
          await loadFallbackProfileLocation();
        }
      }
    }

    async function loadFallbackProfileLocation() {
      if (user?.location_id) {
        try {
          const locObj = await getLocationById(user.location_id);
          if (locObj?.latitude && locObj?.longitude && isMounted) {
            setProLocation({
              latitude: Number(locObj.latitude),
              longitude: Number(locObj.longitude),
            });
            logger.log('[useProLiveLocation] Loaded fallback coordinates from profile location ID:', user.location_id);
          }
        } catch (e) {
          logger.warn('[useProLiveLocation] Failed to load profile fallback location:', e);
        }
      }
    }

    initLocation();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [user?.location_id]);

  return {
    proLocation,
    hasPermission,
  };
}
