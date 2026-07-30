# ⚓ `useHomeViewTaskPost`

**Source File**: [src/hooks/useHomeViewTaskPost.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useHomeViewTaskPost.ts)

## Overview
`useHomeViewTaskPost` encapsulates task creation form state, category bootstrapping from backend (`/app/category/`), subcategory selection, budget controls, payment preferences, and task submission triggers for the Customer Home screen.

---

## Hook Signature

```typescript
export function useHomeViewTaskPost(options: {
  user: User | null;
  activeTask: Task | null;
  createTask: Function;
  mapCoords: { latitude: number; longitude: number } | null;
  address: string;
  isLocationAvailable: boolean;
  setPinAdjusterVisible: (visible: boolean) => void;
  setViewActiveTaskScreen: (visible: boolean) => void;
})
```

---

## Key Responsibilities

1. **Category & Payment Bootstrapping**:
   Fetches categories from backend `/app/category/` and payment options from `/app/payment-preferences/`.
2. **Dynamic Minimum Price Calculation**:
   Extracts `min_base_price` for selected subcategories to enforce pricing validation rules.
3. **Task Posting Trigger (`handleRequestTask`)**:
   Validates description, budget, and location availability before delegating to `createTask()` in `PostJobContext`.

---

## Usage Example

```tsx
import { useHomeViewTaskPost } from '@/hooks/useHomeViewTaskPost';

export default function TaskForm(props: any) {
  const {
    activeCategory,
    categories,
    budget,
    setBudget,
    handleRequestTask,
  } = useHomeViewTaskPost(props);

  return (
    <View>
      <Button title="Submit Task" onPress={handleRequestTask} />
    </View>
  );
}
```
