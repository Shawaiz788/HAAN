import { useQuery } from '@tanstack/react-query';
import { getAllTasks, getOpenTasks } from '@/services/adminTasks';
import { getAllReviews } from '@/services/adminReviews';
import { masterDataService } from '@/services/masterData';
import { DashboardStats } from '@/types/admin';

export function useAdminDashboard() {
  const tasksQuery = useQuery({
    queryKey: ['admin', 'tasks'],
    queryFn: getAllTasks,
    staleTime: 60 * 1000,
  });

  const openTasksQuery = useQuery({
    queryKey: ['admin', 'openTasks'],
    queryFn: getOpenTasks,
    staleTime: 60 * 1000,
  });

  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: getAllReviews,
    staleTime: 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: masterDataService.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const countriesQuery = useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: masterDataService.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const citiesQuery = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: masterDataService.getCities,
    staleTime: 5 * 60 * 1000,
  });

  const areasQuery = useQuery({
    queryKey: ['admin', 'areas'],
    queryFn: masterDataService.getAreas,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    tasksQuery.isLoading ||
    openTasksQuery.isLoading ||
    reviewsQuery.isLoading ||
    categoriesQuery.isLoading ||
    countriesQuery.isLoading ||
    citiesQuery.isLoading ||
    areasQuery.isLoading;

  const isError =
    tasksQuery.isError ||
    openTasksQuery.isError ||
    reviewsQuery.isError ||
    categoriesQuery.isError ||
    countriesQuery.isError ||
    citiesQuery.isError ||
    areasQuery.isError;

  const refetchAll = async () => {
    await Promise.all([
      tasksQuery.refetch(),
      openTasksQuery.refetch(),
      reviewsQuery.refetch(),
      categoriesQuery.refetch(),
      countriesQuery.refetch(),
      citiesQuery.refetch(),
      areasQuery.refetch(),
    ]);
  };

  const stats: DashboardStats = {
    totalUsers: 0,
    totalPros: 0,
    verifiedPros: 0,
    totalTasks: tasksQuery.data?.length || 0,
    openTasks: openTasksQuery.data?.length || 0,
    totalReviews: reviewsQuery.data?.length || 0,
    totalCategories: categoriesQuery.data?.length || 0,
    totalCountries: countriesQuery.data?.length || 0,
    totalCities: citiesQuery.data?.length || 0,
    totalAreas: areasQuery.data?.length || 0,
  };

  return {
    stats,
    tasks: tasksQuery.data || [],
    openTasks: openTasksQuery.data || [],
    reviews: reviewsQuery.data || [],
    isLoading,
    isError,
    refetch: refetchAll,
  };
}
