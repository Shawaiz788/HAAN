# 🛠️ `distanceUtils`

**Source File**: [src/utils/distanceUtils.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/utils/distanceUtils.ts)

## Overview
`distanceUtils` implements the **Haversine Formula** to compute high-precision geodesic distances in kilometers or meters between two GPS coordinates `(lat1, lng1)` and `(lat2, lng2)`. Used for filtering nearby tasks within a professional's radius.

---

## Function Signatures

```typescript
export const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number;

export const formatDistanceText = (distanceKm: number): string;
```

---

## Usage Example

```tsx
import { calculateDistanceKm, formatDistanceText } from '@/utils/distanceUtils';

const distance = calculateDistanceKm(31.4749, 74.3100, 31.4699, 74.2515);
console.log('Distance:', formatDistanceText(distance)); // e.g. "5.2 km away"
```
