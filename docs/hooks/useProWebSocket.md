# ⚓ `useProWebSocket`

**Source File**: [src/hooks/useProWebSocket.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useProWebSocket.ts)

## Overview
`useProWebSocket` maintains a real-time WebSocket connection for professionals to receive instant new task notifications, broadcasted task updates, and live job feed changes in real time.

---

## Hook Signature

```typescript
export function useProWebSocket(options: {
  isOnline: boolean;
  userId?: number | string;
  onNewJobReceived?: (job: BackendTask) => void;
  onJobUpdated?: (job: BackendTask) => void;
}): {
  liveJobs: BackendTask[];
  isConnected: boolean;
  refetchJobs: () => Promise<void>;
}
```

---

## Key Features
1. **Real-time Live Job Stream**: Listens to WebSocket events (`type: 'new_job'`, `type: 'job_cancelled'`, `type: 'job_assigned'`).
2. **REST Fallback Fetching**: Queries `/app/task/` on mount or connection recovery to maintain full job sync.
3. **Local Push Notifications**: Dispatches Expo local push alerts when a relevant job matches the professional's category skills.

---

## Usage Example

```tsx
import { useProWebSocket } from '@/hooks/useProWebSocket';

export default function LiveJobsList() {
  const { liveJobs, isConnected } = useProWebSocket({
    isOnline: true,
    userId: 10,
    onNewJobReceived: (job) => console.log('New job posted:', job.subject),
  });

  return (
    <FlatList
      data={liveJobs}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <Text>{item.subject} - Rs. {item.price}</Text>}
    />
  );
}
```
