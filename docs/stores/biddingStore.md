# 💾 `biddingStore` (Zustand)

**Source File**: [src/store/biddingStore.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/store/biddingStore.ts)

## Overview
`biddingStore` manages bid selection, bid creation modal visibility, active worker bid state, and sorting options for incoming task bids.

---

## State & Actions Interface

```typescript
interface BiddingStoreState {
  bids: Bid[];
  selectedBid: Bid | null;
  isBidModalOpen: boolean;
  setBids: (bids: Bid[]) => void;
  setSelectedBid: (bid: Bid | null) => void;
  openBidModal: (bid?: Bid) => void;
  closeBidModal: () => void;
}
```

---

## Usage Example

```tsx
import useBiddingStore from '@/store/biddingStore';

export default function BidActionButton({ bid }: { bid: Bid }) {
  const { openBidModal } = useBiddingStore();

  return (
    <Button title="View Bid Details" onPress={() => openBidModal(bid)} />
  );
}
```
