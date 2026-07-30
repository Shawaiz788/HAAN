# ⚓ `useBiddingWebSocket`

**Source File**: [src/hooks/useBiddingWebSocket.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useBiddingWebSocket.ts)

## Overview
`useBiddingWebSocket` manages real-time WebSocket communication for task bidding. It allows professionals to submit live bids on open tasks and allows customers to receive instant bid notifications over WebSockets without manual polling.

---

## Hook Signature

```typescript
export function useBiddingWebSocket(options: {
  taskId: number | string | null;
  userId?: number | string;
  onBidReceived?: (bid: Bid) => void;
  enabled?: boolean;
}): {
  bids: Bid[];
  isConnected: boolean;
  sendBid: (amount: number, message?: string) => Promise<boolean>;
}
```

---

## Key Responsibilities
1. **WebSocket Lifecycle**: Connects to `wss://<host>/ws/bidding/<taskId>/` with JWT token parameter and automatic reconnection strategy.
2. **Real-time Broadcast**: Dispatches new bids immediately to all listening clients upon `type: 'bid_placed'` event.
3. **Out-of-Band Fallback**: If WebSocket is disconnected or closed, `sendBid` falls back to REST POST `/app/bid/` automatically.

---

## Usage Example

```tsx
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';

export default function BiddingSection({ taskId, userId }: { taskId: number; userId: number }) {
  const { bids, isConnected, sendBid } = useBiddingWebSocket({
    taskId,
    userId,
    onBidReceived: (newBid) => console.log('New bid arrived:', newBid),
  });

  const handlePlaceBid = async () => {
    await sendBid(4500, 'I can fix this in 1 hour');
  };

  return (
    <View>
      <Text>Connection Status: {isConnected ? 'Connected' : 'Reconnecting'}</Text>
      <Button title="Place Bid" onPress={handlePlaceBid} />
    </View>
  );
}
```
