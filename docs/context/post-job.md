# 🧠 PostJobContext & `usePostJob()`

**Source File**: [src/context/post-job.tsx](file:///c:/Users/Fahad/Documents/KaamKarwao/src/context/post-job.tsx)

## Overview
`PostJobContext` manages customer task creation, backend task syncing (`/app/task/customer/{userId}/`), active task lifecycle states (`searching`, `bidding`, `accepted`), worker bid selection, task cancellation, and task history across customer screens.

---

## Exported Interface & Context Shape

```typescript
interface PostJobContextType {
  activeTask: Task | null;
  taskHistory: Task[];
  bids: Bid[];
  activeChatMessages: ChatMessage[];
  selectedCategory: string | null;
  isCreatingTask: boolean;
  creationStep: string;
  createTask: (
    subcategoryId: number,
    categoryName: string,
    subcategoryName: string,
    paymentPreferenceId: number,
    paymentPreferenceName: string,
    description: string,
    budget: number,
    locationName: string,
    attachmentUris?: string[] | null,
    latitude?: number,
    longitude?: number
  ) => void;
  cancelTask: (onProgress?: (msg: string) => void) => Promise<boolean>;
  acceptBid: (bidId: string, bidObj?: Bid) => void;
  completeTask: () => void;
  sendActiveChatMessage: (text: string) => void;
  clearHistory: () => void;
  openPostJob: (category?: string) => void;
  closePostJob: () => void;
}
```

---

## Primary Functionalities

1. **Backend Task Syncing**:
   - Automatically syncs the user's tasks from `/app/task/customer/{userId}/` on user switch or app launch.
   - Finds any active task with status `searching`, `bidding`, or `accepted` and links it to the active task state.

2. **Task Creation (`createTask`)**:
   - Executes multi-step task creation via `createTaskChain`: uploads media attachments, creates backend task object (`/app/task/`), and launches bidding listeners.

3. **Bid Acceptance (`acceptBid`)**:
   - Accepts a professional's bid, updating the task status to `accepted` and linking worker details.

4. **Task Cancellation (`cancelTask`)**:
   - Executes soft deletion on backend (`DELETE /app/task/{id}/`) and clears active task state cleanly.

---

## Usage Example

```tsx
import { usePostJob } from '@/context/post-job';

export default function CustomerScreen() {
  const { activeTask, createTask, cancelTask } = usePostJob();

  const handlePost = () => {
    createTask(
      12, 'Home Services', 'AC Repair',
      1, 'Cash', 'AC making noise',
      5000, 'Model Town, Lahore',
      null, 31.4749, 74.3100
    );
  };

  return (
    <View>
      {activeTask ? (
        <Text>Active Task: {activeTask.subject}</Text>
      ) : (
        <Button title="Post Job" onPress={handlePost} />
      )}
    </View>
  );
}
```
