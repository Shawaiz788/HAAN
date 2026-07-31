import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllReviews,
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  getCustomerReviews,
} from '@/services/adminReviews';
import { AdminReviewItem } from '@/types/admin';

export const ADMIN_REVIEWS_QUERY_KEY = ['admin', 'reviews'];

export function useAdminReviews() {
  return useQuery({
    queryKey: ADMIN_REVIEWS_QUERY_KEY,
    queryFn: getAllReviews,
    staleTime: 60 * 1000,
  });
}

export function useAdminReviewDetail(id: number | null) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_QUERY_KEY, 'detail', id],
    queryFn: () => (id ? getReviewById(id) : null),
    enabled: Boolean(id),
  });
}

export function useCustomerReviews(userId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_QUERY_KEY, 'customer', userId],
    queryFn: () => (userId ? getCustomerReviews(userId) : []),
    enabled: Boolean(userId),
  });
}

export function useCreateAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminReviewItem>) => createReview(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminReviewItem> }) => updateReview(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_QUERY_KEY });
    },
  });
}

export function useDeleteAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_QUERY_KEY });
    },
  });
}
