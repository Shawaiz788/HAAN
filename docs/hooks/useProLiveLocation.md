# ⚓ `useProLiveLocation`

**Source File**: [src/hooks/useProLiveLocation.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useProLiveLocation.ts)

## Overview
`useProLiveLocation` manages real-time GPS tracking for professionals. When a professional toggles their status to `online`, this hook starts a background location watcher (`Expo Location.watchPositionAsync`) and updates their coordinates on the backend (`PUT /app/user/location/`).

---

## Hook Signature

```typescript
export function useProLiveLocation(options: {
  isOnline: boolean;
  userId?: number | string;
  updateIntervalMs?: number;
}): {
  location: { latitude: number; longitude: number } | null;
  errorMsg: string | null;
}
```

---

## Key Features
1. **Conditional Background Watching**: Only activates GPS location watching when `isOnline` is `true`.
2. **Backend Syncing**: Throttles location sync requests (defaulting to 15 seconds) to minimize battery drain and server load.
3. **Automatic Tear-down**: Clears location subscription immediately when professional toggles `offline` or logs out.

---

## Usage Example

```tsx
import { useProLiveLocation } from '@/hooks/useProLiveLocation';
import useProOnlineStore from '@/store/proOnlineStore';

export default function ProDashboard() {
  const { isOnline } = useProOnlineStore();
  const { location } = useProLiveLocation({ isOnline, userId: 42 });

  return (
    <View>
      <Text>Live Location: {location ? `${location.latitude}, ${location.longitude}` : 'Offline'}</Text>
    </View>
  );
}
```
