import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllTasks,
  getOpenTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getCustomerTasks,
  getWorkerTasks,
} from '@/services/adminTasks';
import { BackendTask } from '@/types';

export const ADMIN_TASKS_QUERY_KEY = ['admin', 'tasks'];

export function useAdminTasks() {
  return useQuery({
    queryKey: ADMIN_TASKS_QUERY_KEY,
    queryFn: getAllTasks,
    staleTime: 60 * 1000,
  });
}

export function useAdminOpenTasks() {
  return useQuery({
    queryKey: [...ADMIN_TASKS_QUERY_KEY, 'open'],
    queryFn: getOpenTasks,
    staleTime: 60 * 1000,
  });
}

export function useAdminTaskDetail(taskId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_TASKS_QUERY_KEY, 'detail', taskId],
    queryFn: () => (taskId ? getTaskById(taskId) : null),
    enabled: Boolean(taskId),
  });
}

export function useAdminCustomerTasks(userId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_TASKS_QUERY_KEY, 'customer', userId],
    queryFn: () => (userId ? getCustomerTasks(userId) : []),
    enabled: Boolean(userId),
  });
}

export function useAdminWorkerTasks(workerId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_TASKS_QUERY_KEY, 'worker', workerId],
    queryFn: () => (workerId ? getWorkerTasks(workerId) : []),
    enabled: Boolean(workerId),
  });
}

export function useUpdateAdminTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BackendTask> }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_TASKS_QUERY_KEY });
    },
  });
}

export function useDeleteAdminTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_TASKS_QUERY_KEY });
    },
  });
}
