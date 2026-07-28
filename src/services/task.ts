import { fetchWithAuth, fetchWithTimeout, API_URL } from './fetchClient';
import { Category, PaymentPreference, Status, BackendTask } from '@/types';
import { TASK_STATUS } from '@/constants/taskStatus';
import { logger } from '@/utils/logger';

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
  logger.log(`[task API] Fetching attachments for task ID: ${taskId}`);
  const url = `${API_URL}/app/attachment/${taskId}/`;

  const response = await fetchWithAuth(url);
  const responseText = await response.text();
  logger.log(`[task API] Get attachments response status for task ${taskId}:`, response.status);

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
  logger.log(`[task API] Uploading attachment from uri: ${uri} for Task ID: ${taskId}`);

  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  formData.append('task_id', taskId.toString());
  formData.append('task', taskId.toString());

  const response = await fetchWithAuth(`${API_URL}/app/attachment/`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  const responseText = await response.text();
  logger.log('[task API] Upload attachment response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to upload attachment. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    return data.id;
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
  logger.log('[task API] Creating task on backend with payload:', JSON.stringify(task));
  const url = `${API_URL}/app/task/`;

  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  const responseText = await response.text();
  logger.log('[task API] Create task response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to create task. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse created task JSON response. Content: ${responseText}`);
  }
};

// Sequential task creation chain: resolve IDs, create task, upload attachments
export const createTaskChain = async (input: TaskChainInput): Promise<Task> => {
  const { subcategoryId, categoryName, subcategoryName, paymentPreferenceId, description, budget, userId, locationId, attachmentUris } = input;
  logger.log('[createTaskChain] Resolving task creation sequence with pre-resolved IDs...', input);

  const subject = subcategoryName ? `${subcategoryName} (${categoryName})` : `${categoryName} Service Needed`;
  const preferredTime = new Date().toISOString();

  const taskPayload = {
    subject,
    body: description,
    price: budget,
    created_by: userId,
    preferred_time: preferredTime,
    location_id: locationId,
    status_id: TASK_STATUS.OPEN,
    payment_preference_id: paymentPreferenceId,
    accurately_estimated: 0,
    subcategory_id: subcategoryId,
  };

  const createdTask = await createTask(taskPayload);
  logger.log(`[createTaskChain] Task created with ID: ${createdTask.id}. Now starting attachments upload...`);

  let failedAttachmentCount = 0;
  if (attachmentUris && attachmentUris.length > 0 && createdTask.id) {
    const uploadPromises = attachmentUris.map(async (uri) => {
      try {
        const uploadResultId = await uploadAttachment(uri, createdTask.id!);
        logger.log(`[createTaskChain] Attachment uploaded successfully with ID: ${uploadResultId} for Task ID: ${createdTask.id}`);
      } catch (err) {
        logger.error(`[createTaskChain] Attachment upload failed for uri: ${uri}. Error:`, err);
        failedAttachmentCount++;
      }
    });

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
  logger.log('[task API] Get statuses response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to fetch statuses. Status: ${response.status}. Response: ${responseText}`);
  }

  return JSON.parse(responseText);
};

export const updateTaskStatusOnBackend = async (
  taskId: number,
  statusId: number
): Promise<BackendTask> => {
  logger.log(`[task API] Updating status of task ${taskId} to status ${statusId}`);
  const url = `${API_URL}/app/task/${taskId}/`;
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status_id: statusId }),
  });

  const responseText = await response.text();
  logger.log('[task API] Update task status response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to update task status on backend. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { message: responseText } as any;
  }
};

export const softDeleteTaskOnBackend = async (
  taskId: number
): Promise<{ message?: string }> => {
  logger.log(`[task API] Soft-deleting task ${taskId}`);
  const url = `${API_URL}/app/task/${taskId}/`;
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const responseText = await response.text();
  logger.log('[task API] Soft-delete task response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to soft-delete task on backend. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { message: responseText };
  }
};

/** Helper to parse potentially varied task list shapes from backend. */
const parseTaskList = (responseText: string): BackendTask[] => {
  const data = JSON.parse(responseText);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && typeof data === 'object' && data.id) return [data as BackendTask];
  return [];
};

export const getUserTasksFromBackend = async (userId: number): Promise<BackendTask[]> => {
  const url = `${API_URL}/app/task/customer/${userId}/`;
  const response = await fetchWithAuth(url);
  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch user tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return parseTaskList(responseText);
  } catch (e) {
    throw new Error(`Failed to parse user tasks JSON response: ${responseText}`);
  }
};

export const getWorkerTasksFromBackend = async (workerId: number): Promise<BackendTask[]> => {
  const url = `${API_URL}/app/task/worker/${workerId}/`;
  const response = await fetchWithAuth(url);
  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch worker tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return parseTaskList(responseText);
  } catch (e) {
    logger.error('[getWorkerTasksFromBackend] JSON parse error:', e);
    return [];
  }
};

export const getOpenTasksFromBackend = async (): Promise<BackendTask[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/task/open/`);
  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 404) {
      logger.log('[getOpenTasksFromBackend] Backend returned 404 (no open tasks found).');
      return [];
    }
    logger.error(`[getOpenTasksFromBackend] Request failed with status ${response.status}`);
    throw new Error(`Failed to fetch open tasks. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return parseTaskList(responseText);
  } catch (e) {
    logger.error('[getOpenTasksFromBackend] JSON parsing error:', e);
    throw new Error(`Failed to parse open tasks JSON. Content: ${responseText}`);
  }
};

export const getTaskByIdFromBackend = async (taskId: number): Promise<BackendTask | null> => {
  const url = `${API_URL}/app/task/${taskId}/`;
  logger.log(`[getTaskByIdFromBackend] Fetching task ${taskId} from URL: ${url}`);
  const response = await fetchWithAuth(url);
  const responseText = await response.text();
  logger.log(`[getTaskByIdFromBackend] Status for task ${taskId}: ${response.status}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch task ${taskId}. Status: ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    logger.error(`[getTaskByIdFromBackend] JSON parse error for task ${taskId}:`, e);
    return null;
  }
};

export const getCompletedStatusId = async (): Promise<number> => {
  try {
    const statuses = await getStatusesFromBackend();
    const completed = statuses.find((s) => s.name.toLowerCase() === 'completed');
    if (completed) return completed.id;
  } catch (e) {
    logger.warn('[getCompletedStatusId] Failed to fetch backend statuses, fallback to COMPLETED:', e);
  }
  return TASK_STATUS.COMPLETED;
};
