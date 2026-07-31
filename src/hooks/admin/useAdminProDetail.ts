import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, verifyUserStatus, getUserRating } from '@/services/adminUsers';
import { getWorkerEarnings } from '@/services/adminEarnings';
import { getWorkerTasks } from '@/services/adminTasks';
import { getCustomerReviews } from '@/services/adminReviews';

export const ADMIN_PRO_DETAIL_QUERY_KEY = ['admin', 'proDetail'];

export function useAdminProDetail(userId: number) {
  const profileQuery = useQuery({
    queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: Boolean(userId),
  });

  const ratingQuery = useQuery({
    queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'rating', userId],
    queryFn: () => getUserRating(userId),
    enabled: Boolean(userId),
  });

  const earningsQuery = useQuery({
    queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'earnings', userId],
    queryFn: () => getWorkerEarnings(userId),
    enabled: Boolean(userId),
  });

  const tasksQuery = useQuery({
    queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'tasks', userId],
    queryFn: () => getWorkerTasks(userId),
    enabled: Boolean(userId),
  });

  const reviewsQuery = useQuery({
    queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'reviews', userId],
    queryFn: () => getCustomerReviews(userId),
    enabled: Boolean(userId),
  });

  const isLoading =
    profileQuery.isLoading ||
    ratingQuery.isLoading ||
    earningsQuery.isLoading ||
    tasksQuery.isLoading ||
    reviewsQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      profileQuery.refetch(),
      ratingQuery.refetch(),
      earningsQuery.refetch(),
      tasksQuery.refetch(),
      reviewsQuery.refetch(),
    ]);
  };

  return {
    profile: profileQuery.data || null,
    rating: ratingQuery.data || { rating: 5.0, count: 0 },
    earnings: earningsQuery.data || null,
    tasks: tasksQuery.data || [],
    reviews: reviewsQuery.data || [],
    isLoading,
    refetch,
  };
}

export function useVerifyUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isVerified }: { userId: number; isVerified: boolean }) =>
      verifyUserStatus(userId, isVerified),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_PRO_DETAIL_QUERY_KEY, 'profile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'unverified-users'] });
    },
  });
}
