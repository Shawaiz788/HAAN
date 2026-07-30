# 💾 `taskStore` (Zustand + MMKV)

**Source File**: [src/store/taskStore.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/store/taskStore.ts)

## Overview
`taskStore` manages active task state and task history per user with synchronous MMKV storage persistence (`react-native-mmkv`). It supports multi-user switching so user task state stays isolated upon logout or account change.

---

## State & Actions Interface

```typescript
interface TaskStoreState {
  activeTask: Task | null;
  taskHistory: Task[];
  userId: number | null;
  setActiveTask: (task: Task | null) => void;
  setTaskHistory: (history: Task[]) => void;
  addTaskToHistory: (task: Task) => void;
  switchUser: (newUserId: number | null) => void;
  clearHistory: () => void;
}
```

---

## Key Features
1. **MMKV Persistence**: Saves task history and active task under user-scoped storage keys (`kaamkarwao_active_task_<userId>`, `kaamkarwao_task_history_<userId>`).
2. **Multi-User Isolation**: `switchUser(newUserId)` immediately unloads previous user tasks and loads the newly authenticated user's cached task state from MMKV.

---

## Usage Example

```tsx
import useTaskStore from '@/store/taskStore';

export default function ActiveTaskBanner() {
  const { activeTask, setActiveTask } = useTaskStore();

  if (!activeTask) return null;

  return (
    <View>
      <Text>Active Task #{activeTask.backend_id}: {activeTask.subject}</Text>
    </View>
  );
}
```
