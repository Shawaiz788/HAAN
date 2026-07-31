import { fetchWithAuth, API_URL } from './fetchClient';
import { BackendTask } from '@/types';

export const getAllTasks = async (): Promise<BackendTask[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch tasks. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const getOpenTasks = async (): Promise<BackendTask[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/open/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch open tasks. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const getTaskById = async (id: number): Promise<BackendTask | null> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch task ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const updateTask = async (id: number, data: Partial<BackendTask>): Promise<BackendTask> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update task ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const deleteTask = async (id: number): Promise<boolean> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete task ${id}. Status: ${response.status}`);
  }
  return true;
};

export const getCustomerTasks = async (userId: number): Promise<BackendTask[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/customer/${userId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch customer tasks. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const getWorkerTasks = async (workerId: number): Promise<BackendTask[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/task/worker/${workerId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch worker tasks. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};
