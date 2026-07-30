# ⚓ `useActiveBids`

**Source File**: [src/hooks/useActiveBids.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useActiveBids.ts)

## Overview
`useActiveBids` is a custom hook designed for customers to filter, sort, and poll incoming worker bids for an active task. It manages bid lists, loading states, and periodic polling backups.

---

## Hook Signature

```typescript
export function useActiveBids(taskId?: number | string | null): {
  bids: Bid[];
  loading: boolean;
  refetchBids: () => Promise<void>;
}
```

---

## Primary Features
1. **Bid Querying**: Queries task bids endpoint (`/app/bid/task/{taskId}/`) when `taskId` is present.
2. **Data Normalization**: Transforms backend bid models into normalized frontend `Bid` objects, extracting worker names, avatars, ratings, and proposed pricing.
3. **Automatic Deduplication**: Sorts bids by timestamp or price while deduplicating duplicate worker bids.

---

## Usage Example

```tsx
import { useActiveBids } from '@/hooks/useActiveBids';

export default function BidsList({ taskId }: { taskId: number }) {
  const { bids, loading, refetchBids } = useActiveBids(taskId);

  if (loading) return <ActivityIndicator />;

  return (
    <FlatList
      data={bids}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Text>{item.worker_name} - Rs. {item.amount}</Text>
      )}
    />
  );
}
```
