# ⚓ `useHomeViewLocation`

**Source File**: [src/hooks/useHomeViewLocation.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useHomeViewLocation.ts)

## Overview
`useHomeViewLocation` handles map location management, Nominatim location search, reverse geocoding, Leaflet offset math, and polygon geofence validation for the Customer Home view.

---

## Hook Signature & Return Interface

```typescript
export function useHomeViewLocation(options: {
  webViewRef: React.RefObject<any>;
}): {
  mapCoords: { latitude: number; longitude: number } | null;
  initialCoords: { latitude: number; longitude: number } | null;
  loadingLocation: boolean;
  isGeocoding: boolean;
  address: string;
  isLocationAvailable: boolean;
  unavailabilityReason: string;
  searchModalVisible: boolean;
  pinAdjusterVisible: boolean;
  searchQuery: string;
  searchResults: any[];
  searchingLocation: boolean;
  locStreet: string;
  locArea: string;
  locCity: string;
  reverseGeocode: (lat: number, lng: number) => Promise<void>;
  reCenterMap: () => Promise<void>;
  searchLocations: (query: string) => Promise<void>;
  openSearchModal: () => void;
  selectSearchResult: (item: any) => void;
  confirmAdjustedLocation: (lat: number, lng: number) => void;
  updateMapFromFields: () => void;
  handleMapMessage: (event: any) => void;
}
```

---

## Primary Functionalities

1. **Leaflet Viewport Offset Math**:
   Injects JavaScript into the WebView to adjust the Leaflet map center point upwards by 15% (`0.5 - 0.35`). This aligns the target coordinate directly under the visible pin icon positioned above the sliding bottom sheet.

2. **Geofence Validation (`validateCoordinatesServiceability`)**:
   Validates pin coordinates against high-density polygon boundaries in [geofenceService.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/geofenceService.ts). Sets `isLocationAvailable = false` if outside operational coverage zones.

3. **Location Search & Geocoding**:
   Provides Nominatim address search, reverse geocoding via `Expo Location`, and cached location storage in MMKV.

---

## Usage Example

```tsx
import { useHomeViewLocation } from '@/hooks/useHomeViewLocation';

export default function MapContainer({ webViewRef }: { webViewRef: any }) {
  const {
    initialCoords,
    address,
    isLocationAvailable,
    reCenterMap,
  } = useHomeViewLocation({ webViewRef });

  return (
    <View>
      <Text>Address: {address}</Text>
      {!isLocationAvailable && <Text style={{ color: 'red' }}>Services Not Available Here</Text>}
      <Button title="Recenter" onPress={reCenterMap} />
    </View>
  );
}
```
