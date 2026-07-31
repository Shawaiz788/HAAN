import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterDataService } from '@/services/masterData';

export const ADMIN_MASTER_DATA_QUERY_KEY = ['admin', 'masterData'];

export type MasterDataEndpoint =
  | 'category'
  | 'sub/category'
  | 'country'
  | 'city'
  | 'area'
  | 'location'
  | 'usertype'
  | 'paymentpref'
  | 'status'
  | 'config';

export function useMasterDataList<T = any>(endpoint: MasterDataEndpoint) {
  return useQuery({
    queryKey: [...ADMIN_MASTER_DATA_QUERY_KEY, endpoint],
    queryFn: async () => {
      switch (endpoint) {
        case 'category':
          return masterDataService.getCategories();
        case 'sub/category':
          return masterDataService.getSubcategories();
        case 'country':
          return masterDataService.getCountries();
        case 'city':
          return masterDataService.getCities();
        case 'area':
          return masterDataService.getAreas();
        case 'location':
          return masterDataService.getLocations();
        case 'usertype':
          return masterDataService.getUserTypes();
        case 'paymentpref':
          return masterDataService.getPaymentPrefs();
        case 'status':
          return masterDataService.getStatuses();
        case 'config':
          return masterDataService.getConfigs();
        default:
          return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMasterDataItem(endpoint: MasterDataEndpoint) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => {
      switch (endpoint) {
        case 'category':
          return masterDataService.createCategory(payload);
        case 'sub/category':
          return masterDataService.createSubcategory(payload);
        case 'country':
          return masterDataService.createCountry(payload);
        case 'city':
          return masterDataService.createCity(payload);
        case 'area':
          return masterDataService.createArea(payload);
        case 'location':
          return masterDataService.createLocation(payload);
        case 'usertype':
          return masterDataService.createUserType(payload);
        case 'paymentpref':
          return masterDataService.createPaymentPref(payload);
        case 'status':
          return masterDataService.createStatus(payload);
        case 'config':
          return masterDataService.createConfig(payload);
        default:
          throw new Error(`Unsupported endpoint: ${endpoint}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_MASTER_DATA_QUERY_KEY, endpoint] });
    },
  });
}

export function useUpdateMasterDataItem(endpoint: MasterDataEndpoint) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => {
      switch (endpoint) {
        case 'category':
          return masterDataService.updateCategory(id, payload);
        case 'sub/category':
          return masterDataService.updateSubcategory(id, payload);
        case 'country':
          return masterDataService.updateCountry(id, payload);
        case 'city':
          return masterDataService.updateCity(id, payload);
        case 'area':
          return masterDataService.updateArea(id, payload);
        case 'location':
          return masterDataService.updateLocation(id, payload);
        case 'usertype':
          return masterDataService.updateUserType(id, payload);
        case 'paymentpref':
          return masterDataService.updatePaymentPref(id, payload);
        case 'status':
          return masterDataService.updateStatus(id, payload);
        case 'config':
          return masterDataService.updateConfig(id, payload);
        default:
          throw new Error(`Unsupported endpoint: ${endpoint}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_MASTER_DATA_QUERY_KEY, endpoint] });
    },
  });
}

export function useDeleteMasterDataItem(endpoint: MasterDataEndpoint) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      switch (endpoint) {
        case 'category':
          return masterDataService.deleteCategory(id);
        case 'sub/category':
          return masterDataService.deleteSubcategory(id);
        case 'country':
          return masterDataService.deleteCountry(id);
        case 'city':
          return masterDataService.deleteCity(id);
        case 'area':
          return masterDataService.deleteArea(id);
        case 'location':
          return masterDataService.deleteLocation(id);
        case 'usertype':
          return masterDataService.deleteUserType(id);
        case 'paymentpref':
          return masterDataService.deletePaymentPref(id);
        case 'status':
          return masterDataService.deleteStatus(id);
        case 'config':
          return masterDataService.deleteConfig(id);
        default:
          throw new Error(`Unsupported endpoint: ${endpoint}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_MASTER_DATA_QUERY_KEY, endpoint] });
    },
  });
}
