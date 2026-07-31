import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUnverifiedUsers,
  updateAdminUserVerification,
} from '@/services/adminUnverifiedUsers';

export const ADMIN_UNVERIFIED_USERS_QUERY_KEY = ['admin', 'unverified-users'];

export function useAdminUnverifiedUsers() {
  return useQuery({
    queryKey: ADMIN_UNVERIFIED_USERS_QUERY_KEY,
    queryFn: getAdminUnverifiedUsers,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useVerifyAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      isVerified,
      rejectionReason,
    }: {
      userId: number;
      isVerified: boolean;
      rejectionReason?: string;
    }) => updateAdminUserVerification(userId, isVerified, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_UNVERIFIED_USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
