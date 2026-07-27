import { fetchWithAuth, fetchWithTimeout } from './fetchClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';


import { Category, PaymentPreference, Status, BackendTask } from '@/types';

export { Category, PaymentPreference, Status };
export type Task = BackendTask;

export interface TaskChainInput {
  subcategoryId: number;
  categoryName: string;
  subcategoryName?: string;
  paymentPreferenceId: number;
  description: string;
  budget: number;
  userId: number;
  locationId: number;
  attachmentUris?: string[] | null;
}

// Fetch task attachments for a given taskId
export const getTaskAttachments = async (taskId: number): Promise<any[]> => {
  console.log(`[task API] Fetching attachments for task ID: ${taskId}`);
  const url = `${API_URL}/app/attachment/${taskId}/`;

  const response = await fetchWithAuth(url);
  const responseText = await response.text();
  console.log(`[task API] Get attachments response status for task ${taskId}:`, response.status);
  console.log(`[task API] Get attachments response body for task ${taskId}:`, responseText);

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch task attachments for task ${taskId}. Status: ${response.status}`);
  }

  try {
    const data = JSON.parse(responseText);
    return Array.isArray(data) ? data : (data.results || data.attachments || []);
  } catch (e) {
    throw new Error(`Failed to parse attachments JSON for task ${taskId}. Content: ${responseText}`);
  }
};

// Upload file to backend attachment endpoint using multipart/form-data, linking it to taskId
export const uploadAttachment = async (uri: string, taskId: number): Promise<number> => {
  console.log(`[task API] Uploading attachment from uri: ${uri} for Task ID: ${taskId}`);

  // 1. Create a FormData instance
  const formData = new FormData();

  // 2. Extract name and mime type from uri
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  // 3. Append the file details using the format React Native expects for blobs/files
  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  // Append task relationship fields so backend registers this attachment to the task
  formData.append('task_id', taskId.toString());
  formData.append('task', taskId.toString());

  // 4. Dispatch multipart fetch request with authenticated wrapper
  const response = await fetchWithAuth(`${API_URL}/app/attachment/`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  const responseText = await response.text();
  console.log('[task API] Upload attachment response status:', response.status);
  console.log('[task API] Upload attachment response body:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to upload attachment. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    return data.id; // Return the attachment's database ID
  } catch (e) {
    throw new Error(`Failed to parse attachment upload response. Content: ${responseText}`);
  }
};

// Fetch categories list (authenticated)
export const getCategoriesFromBackend = async (): Promise<Category[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/category/`);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to fetch categories. Status: ${response.status}. Response: ${responseText}`);
  }

  return JSON.parse(responseText);
};

// Fetch payment preferences list (authenticated)
export const getPaymentPreferencesFromBackend = async (): Promise<PaymentPreference[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/paymentpref/`);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to fetch payment preferences. Status: ${response.status}. Response: ${responseText}`);
  }

  return JSON.parse(responseText);
};

// Send create task request (authenticated with automatic retry)
export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  console.log('[task API] Creating task on backend with payload:', JSON.stringify(task));
  const url = `${API_URL}/app/task/`;

  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  const responseText = await response.text();
  console.log('[task API] Create task response status:', response.status);
  console.log('[task API] Create task response body:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to create task. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse created task JSON response. Content: ${responseText}`);
  }
};

// Sequential task creation chain:
// 1. Match category ID
// 2. Match payment preference ID
// 3. Upload attachment (if any) to get attachment_id
// 4. Assemble inputs (subject, timestamps, location details)
// 5. Send request to endpoint
export const createTaskChain = async (input: TaskChainInput): Promise<Task> => {
  const { subcategoryId, categoryName, subcategoryName, paymentPreferenceId, description, budget, userId, locationId, attachmentUris } = input;
  console.log('[createTaskChain] Resolving task creation sequence with pre-resolved IDs...', input);

  // 1. Construct Subject line
  const subject = subcategoryName ? `${subcategoryName} (${categoryName})` : `${categoryName} Service Needed`;

  // 2. Construct timestamp
  const preferredTime = new Date().toISOString();

  // 3. Dispatch task first (so we obtain its database ID)
  const taskPayload = {
    subject,
    body: description,
    price: budget,
    created_by: userId,
    preferred_time: preferredTime,
    location_id: locationId,
    status_id: 1, // Default status id is 1
    payment_preference_id: paymentPreferenceId,
    accurately_estimated: 0, // Default accurately_estimated
    subcategory_id: subcategoryId,
  };

  const createdTask = await createTask(taskPayload);
  console.log(`[createTaskChain] Task created with ID: ${createdTask.id}. Now starting attachments upload...`);

  // 6. Upload multiple attachments to backend (now linked to task ID)
  let failedAttachmentCount = 0;
  if (attachmentUris && attachmentUris.length > 0 && createdTask.id) {
    const uploadPromises = attachmentUris.map(async (uri) => {
      try {
        const uploadResultId = await uploadAttachment(uri, createdTask.id!);
        console.log(`[createTaskChain] Attachment uploaded successfully with ID: ${uploadResultId} for Task ID: ${createdTask.id}`);
      } catch (err) {
        console.error(`[createTaskChain] Attachment upload failed for uri: ${uri}. Error:`, err);
        failedAttachmentCount++;
      }
    });

    // Run parallel uploads
    await Promise.all(uploadPromises);
  }

  if (failedAttachmentCount > 0) {
    createdTask._failedAttachmentCount = failedAttachmentCount;
  }

  return createdTask;
};



export const getStatusesFromBackend = async (): Promise<Status[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/status/`);
  const responseText = await response.text();
  console.log('[task API] Get statuses response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to fetch statuses. Status: ${response.status}. Response: ${responseText}`);
  }

  return JSON.parse(responseText);
};

export const updateTaskStatusOnBackend = async (
  taskId: number,
  statusId: number
): Promise<any> => {
  console.log(`[task API] Updating status of task ${taskId} to status ${statusId}`);
  const url = `${API_URL}/app/task/${taskId}/`;
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status_id: statusId }),
  });

  const responseText = await response.text();
  console.log('[task API] Update task status response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to update task status on backend. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { message: responseText };
  }
};

export const softDeleteTaskOnBackend = async (
  taskId: number
): Promise<any> => {
  console.log(`[task API] Soft-deleting task ${taskId}`);
  const url = `${API_URL}/app/task/${taskId}/`;
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const responseText = await response.text();
  console.log('[task API] Soft-delete task response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to soft-delete task on backend. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { message: responseText };
  }
};

// export const assignTaskWorker = async (
//   taskId: number,
//   workerId: number
// ): Promise<any> => {
//   console.log(`[task API] Assigning task ${taskId} to worker ${workerId}`);
//   const url = `${API_URL}/app/task/${taskId}/`;

//   const response = await fetchWithAuth(url, {
//     method: 'PATCH',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ worker_id: workerId }),
//   });

//   const responseText = await response.text();
//   console.log('[task API] Assign task worker response status:', response.status);
//   console.log('[task API] Assign task worker response body:', responseText);

//   if (!response.ok) {
//     throw new Error(`Failed to assign worker to task on backend. Status: ${response.status}. Response: ${responseText}`);
//   }

//   try {
//     return JSON.parse(responseText);
//   } catch (e) {
//     return { message: responseText };
//   }
// };

export const getUserTasksFromBackend = async (userId: number): Promise<BackendTask[]> => {
  //console.log(`[getUserTasksFromBackend] Fetching user tasks from exact endpoint: ${API_URL}/app/task/customer/${userId}/`);
  const url = `${API_URL}/app/task/customer/${userId}/`;

  const response = await fetchWithAuth(url);
  const responseText = await response.text();
  //console.log(`[getUserTasksFromBackend] Response Status: ${response.status}`);
  //console.log(`[getUserTasksFromBackend] Raw Response Body:`, responseText);

  if (!response.ok) {
    if (response.status === 404) {
      //  console.log(`[getUserTasksFromBackend] Backend returned 404 for user ${userId}. Returning empty array.`);
      return [];
    }
    throw new Error(`Failed to fetch user tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && (data as any).id) return [data as BackendTask];
    return [];
  } catch (e) {
    // console.error('[getUserTasksFromBackend] JSON parse error:', e);
    throw new Error(`Failed to parse user tasks JSON response: ${responseText}`);
  }
};

export const getWorkerTasksFromBackend = async (workerId: number): Promise<BackendTask[]> => {
  const url = `${API_URL}/app/task/worker/${workerId}/`;
  const response = await fetchWithAuth(url);
  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch worker tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && (data as any).id) return [data as BackendTask];
    return [];
  } catch (e) {
    console.error('[getWorkerTasksFromBackend] JSON parse error:', e);
    return [];
  }
};

export const getOpenTasksFromBackend = async (): Promise<BackendTask[]> => {
  //console.log(`[getOpenTasksFromBackend] Dispatching request to URL: ${API_URL}/app/task/open/`);

  const response = await fetchWithAuth(`${API_URL}/app/task/open/`);
  const responseText = await response.text();
  // console.log(`[getOpenTasksFromBackend] Response Status: ${response.status}`);
  //console.log(`[getOpenTasksFromBackend] Raw Response Body:`, responseText);

  if (!response.ok) {
    if (response.status === 404) {
      console.log('[getOpenTasksFromBackend] Backend returned 404 (no open tasks found).');
      return [];
    }
    console.error(`[getOpenTasksFromBackend] Request failed with status ${response.status}`);
    throw new Error(`Failed to fetch open tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    let tasksArray: BackendTask[] = [];

    if (Array.isArray(data)) {
      tasksArray = data;
    } else if (data && Array.isArray(data.results)) {
      tasksArray = data.results;
    } else if (data && typeof data === 'object' && (data as any).id) {
      tasksArray = [data as BackendTask];
    }

    // console.log(`[getOpenTasksFromBackend] Parsed ${tasksArray.length} open tasks from backend payload.`);
    return tasksArray;
  } catch (e) {
    console.error('[getOpenTasksFromBackend] JSON parsing error:', e);
    throw new Error(`Failed to parse open tasks JSON. Content: ${responseText}`);
  }
};

export const getTaskByIdFromBackend = async (taskId: number): Promise<BackendTask | null> => {
  const url = `${API_URL}/app/task/${taskId}/`;
  console.log(`[getTaskByIdFromBackend] Fetching task ${taskId} from URL: ${url}`);
  const response = await fetchWithAuth(url);
  const responseText = await response.text();
  console.log(`[getTaskByIdFromBackend] Status for task ${taskId}: ${response.status}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch task ${taskId}. Status: ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error(`[getTaskByIdFromBackend] JSON parse error for task ${taskId}:`, e);
    return null;
  }
};

export const getCompletedStatusId = async (): Promise<number> => {
  try {
    const statuses = await getStatusesFromBackend();
    const completed = statuses.find((s) => s.name.toLowerCase() === 'completed');
    if (completed) return completed.id;
  } catch (e) {
    console.warn('[getCompletedStatusId] Failed to fetch backend statuses, fallback to 4:', e);
  }
  return 4;
};



