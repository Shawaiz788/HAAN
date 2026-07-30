# ⚓ `useAdminDashboard`

**Source File**: [src/hooks/admin/useAdminDashboard.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/admin/useAdminDashboard.ts)

## Overview
`useAdminDashboard` is a TanStack Query hook (`useQuery`) that fetches, caches, and aggregates administrative dashboard statistics, including total tasks, open tasks, user reviews, categories, countries, cities, and areas.

---

## Hook Signature

```typescript
export function useAdminDashboard(): {
  stats: AdminDashboardStats;
  loading: boolean;
  refetchAll: () => void;
}
```

---

## Usage Example

```tsx
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard';

export default function AdminDashboardView() {
  const { stats, loading, refetchAll } = useAdminDashboard();

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Total Tasks: {stats.totalTasksCount}</Text>
      <Text>Open Tasks: {stats.openTasksCount}</Text>
      <Button title="Refresh Metrics" onPress={refetchAll} />
    </View>
  );
}
```
