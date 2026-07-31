import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllEarnings,
  createEarning,
  getWorkerEarnings,
  updateWorkerEarnings,
  deleteWorkerEarnings,
} from '@/services/adminEarnings';
import { AdminEarningItem } from '@/types/admin';

export const ADMIN_EARNINGS_QUERY_KEY = ['admin', 'earnings'];

export function useAdminEarnings() {
  return useQuery({
    queryKey: ADMIN_EARNINGS_QUERY_KEY,
    queryFn: getAllEarnings,
    staleTime: 60 * 1000,
  });
}

export function useWorkerEarnings(workerId: number | string | null) {
  return useQuery({
    queryKey: [...ADMIN_EARNINGS_QUERY_KEY, 'worker', workerId],
    queryFn: () => (workerId ? getWorkerEarnings(workerId) : null),
    enabled: Boolean(workerId),
  });
}

export function useCreateAdminEarning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminEarningItem>) => createEarning(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EARNINGS_QUERY_KEY });
    },
  });
}

export function useUpdateWorkerEarnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, payload }: { workerId: number | string; payload: Partial<AdminEarningItem> }) =>
      updateWorkerEarnings(workerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EARNINGS_QUERY_KEY });
    },
  });
}

export function useDeleteWorkerEarnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workerId: number | string) => deleteWorkerEarnings(workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EARNINGS_QUERY_KEY });
    },
  });
}
