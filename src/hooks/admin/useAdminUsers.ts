import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateAdminUserById,
  deleteAdminUser,
  CreateAdminUserPayload,
} from '@/services/adminUsers';
import { AdminUserItem } from '@/types/admin';

export const ADMIN_USERS_QUERY_KEY = ['admin', 'users'];

export function useAdminUsers(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, page, pageSize],
    queryFn: () => getAdminUsers(page, pageSize),
    staleTime: 60 * 1000,
  });
}

export function useAdminUserDetail(userId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, 'detail', userId],
    queryFn: () => (userId ? getAdminUserById(userId) : null),
    enabled: Boolean(userId),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => createAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUserItem> & Record<string, any> }) =>
      updateAdminUserById(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
  });
}
