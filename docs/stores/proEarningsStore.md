# 💾 `proEarningsStore` (Zustand)

**Source File**: [src/store/proEarningsStore.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/store/proEarningsStore.ts)

## Overview
`proEarningsStore` manages professional worker earnings metrics (weekly earnings, total earnings, jobs completed). It implements a 10-minute TTL cache (`CACHE_TTL_MS = 10 * 60 * 1000`) to prevent unnecessary REST API calls to `/app/earning/{worker_id}/`.

---

## State & Actions Interface

```typescript
interface ProEarningsState {
  earnings: ProEarnings | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchEarnings: (workerId: number, forceRefresh?: boolean) => Promise<ProEarnings | null>;
  clearEarnings: () => void;
}
```

---

## Key Features
1. **TTL Cache Invalidation**: Unless `forceRefresh = true` is passed, `fetchEarnings` reuses cached earnings if less than 10 minutes have elapsed since `lastFetchedAt`.
2. **Force Refresh**: Tapping the dashboard refresh button passes `forceRefresh = true` to bypass the TTL cache and pull fresh data from the server.

---

## Usage Example

```tsx
import useProEarningsStore from '@/store/proEarningsStore';

export default function EarningsCard({ workerId }: { workerId: number }) {
  const { earnings, fetchEarnings, loading } = useProEarningsStore();

  useEffect(() => {
    fetchEarnings(workerId);
  }, [workerId]);

  return (
    <Text>Weekly Earnings: Rs. {earnings?.weekly_earning || 0}</Text>
  );
}
```
