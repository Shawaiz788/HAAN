# 🌐 `task` Service

**Source File**: [src/services/task.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/task.ts)

## Overview
`task.ts` contains API client functions for task creation, task updating, task deletion, worker task querying (`/app/task/worker/{worker_id}/`), customer task querying (`/app/task/customer/{user_id}/`), media attachment uploading (`uploadAttachment`), and attachment details fetching (`getAttachmentById`).

---

## Primary Function Signatures

```typescript
export const createTaskChain = async (...args): Promise<Task>;
export const uploadAttachment = async (uri: string, taskId: number): Promise<{ id: number; url: string }>;
export const getAttachmentById = async (attachmentId: number | string, taskId?: number | string): Promise<{ id: number | string; url: string }>;
export const getUserTasksFromBackend = async (userId: number): Promise<BackendTask[]>;
export const getWorkerTasksFromBackend = async (workerId: number): Promise<BackendTask[]>;
export const softDeleteTaskOnBackend = async (taskId: number): Promise<boolean>;
```

---

## Key Reliability Details

1. **`uploadAttachment` Item Selection**:
   When POSTing media files to `/app/attachment/`, if Django REST framework returns a list of task attachments, `uploadAttachment` selects `data[data.length - 1]` (the newly uploaded attachment) and normalizes its image URL.

2. **`getAttachmentById` Safe Resolution**:
   Queries single attachment endpoint `/app/attachment/{id}/` and matches strictly against `x.id` or `x.attachment_id` to prevent defaulting to wrong image fallbacks.

---

## Usage Example

```typescript
import { getUserTasksFromBackend } from '@/services/task';

const tasks = await getUserTasksFromBackend(42);
console.log('Customer tasks count:', tasks.length);
```
