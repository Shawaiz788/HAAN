import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllAttachments,
  getAttachmentById,
  getTaskAttachments,
  updateAttachment,
  deleteAttachment,
} from '@/services/attachment';
import { AdminAttachmentItem } from '@/types/admin';

export const ADMIN_ATTACHMENTS_QUERY_KEY = ['admin', 'attachments'];

export function useAdminAttachments() {
  return useQuery({
    queryKey: ADMIN_ATTACHMENTS_QUERY_KEY,
    queryFn: getAllAttachments,
    staleTime: 60 * 1000,
  });
}

export function useAdminAttachmentDetail(id: number | null) {
  return useQuery({
    queryKey: [...ADMIN_ATTACHMENTS_QUERY_KEY, 'detail', id],
    queryFn: () => (id ? getAttachmentById(id) : null),
    enabled: Boolean(id),
  });
}

export function useAdminTaskAttachments(taskId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_ATTACHMENTS_QUERY_KEY, 'task', taskId],
    queryFn: () => (taskId ? getTaskAttachments(taskId) : []),
    enabled: Boolean(taskId),
  });
}

export function useUpdateAdminAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminAttachmentItem> }) =>
      updateAttachment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ATTACHMENTS_QUERY_KEY });
    },
  });
}

export function useDeleteAdminAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ATTACHMENTS_QUERY_KEY });
    },
  });
}
