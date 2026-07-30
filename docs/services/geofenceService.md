# 🌐 `geofenceService`

**Source File**: [src/services/geofenceService.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/geofenceService.ts)

## Overview
`geofenceService` implements real-world geographic polygon boundary validation for supported housing societies and major coverage areas in Lahore (Bahria Town, Model Town, Gulberg, DHA, Johar Town, Faisal Town, Wapda Town, Allama Iqbal Town, Township, etc.).

---

## Primary Functionalities

1. **Polygon Geofence Validation (`validateCoordinatesServiceability`)**:
   - Accepts `(latitude, longitude)` coordinates.
   - Evaluates whether the point falls inside active area boundary polygons (`AREA_POLYGONS`) using point-in-polygon math or within a `bufferMeters` boundary threshold.
   - Returns `{ isAvailable: true, matchedAreaName: 'DHA', message: 'Service Available in DHA' }` or `{ isAvailable: false, message: 'Services Not Available in this location' }`.

---

## Usage Example

```typescript
import { validateCoordinatesServiceability } from '@/services/geofenceService';

const result = validateCoordinatesServiceability(31.4749, 74.3100);
if (result.isAvailable) {
  console.log('Location covered:', result.matchedAreaName);
} else {
  console.log('Service not available here');
}
```
