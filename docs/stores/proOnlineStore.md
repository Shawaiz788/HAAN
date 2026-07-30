# 💾 `proOnlineStore` (Zustand + MMKV)

**Source File**: [src/store/proOnlineStore.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/store/proOnlineStore.ts)

## Overview
`proOnlineStore` manages professional online/offline status (`isOnline: boolean`). It persists online status to MMKV (`pro_is_online`) so the professional's status is preserved across app reboots.

---

## State & Actions Interface

```typescript
interface ProOnlineState {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  toggleOnline: () => void;
}
```

---

## Usage Example

```tsx
import useProOnlineStore from '@/store/proOnlineStore';

export default function OnlineSwitch() {
  const { isOnline, toggleOnline } = useProOnlineStore();

  return (
    <Switch value={isOnline} onValueChange={toggleOnline} />
  );
}
```
