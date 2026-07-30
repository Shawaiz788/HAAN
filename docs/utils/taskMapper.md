# 🛠️ `taskMapper`

**Source File**: [src/utils/taskMapper.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/utils/taskMapper.ts)

## Overview
`taskMapper` transforms backend Django REST API task responses (`BackendTask`) into normalized local frontend `Task` objects. It handles status mapping (`status_id` 1 -> `searching`, 2 -> `bidding`, 4 -> `done`, 5 -> `cancelled`), pricing formatting, category label mapping, and image attachment URL normalization.

---

## Function Signatures

```typescript
export const mapBackendTaskToLocal = (bt: BackendTask): Task;
export const mapLocalTaskToBackendPayload = (task: Task): Partial<BackendTask>;
```

---

## Usage Example

```tsx
import { mapBackendTaskToLocal } from '@/utils/taskMapper';

const backendData = { id: 101, status_id: 2, subject: 'AC Repair', price: 5000 };
const localTask = mapBackendTaskToLocal(backendData);

console.log(localTask.status); // "bidding"
```
