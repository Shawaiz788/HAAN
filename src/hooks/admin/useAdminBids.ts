import { useQuery } from '@tanstack/react-query';
import { getTaskBids } from '@/services/bidding';

export const ADMIN_BIDS_QUERY_KEY = ['admin', 'bids'];

export function useAdminBids(taskId: number | null) {
  return useQuery({
    queryKey: [...ADMIN_BIDS_QUERY_KEY, taskId],
    queryFn: () => (taskId ? getTaskBids(taskId) : []),
    enabled: Boolean(taskId),
    staleTime: 60 * 1000,
  });
}
