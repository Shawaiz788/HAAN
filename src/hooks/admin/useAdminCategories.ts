import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/category';
import { CreateCategoryPayload, CreateSubCategoryPayload } from '@/types/category';

export const ADMIN_CATEGORIES_QUERY_KEY = ['admin', 'categories'];
export const ADMIN_SUBCATEGORIES_QUERY_KEY = ['admin', 'subcategories'];

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_QUERY_KEY,
    queryFn: categoryService.getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSubcategories() {
  return useQuery({
    queryKey: ADMIN_SUBCATEGORIES_QUERY_KEY,
    queryFn: categoryService.getSubcategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoryService.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateCategoryPayload> }) =>
      categoryService.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY });
    },
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubCategoryPayload) => categoryService.createSubcategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SUBCATEGORIES_QUERY_KEY });
    },
  });
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateSubCategoryPayload> }) =>
      categoryService.updateSubcategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SUBCATEGORIES_QUERY_KEY });
    },
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryService.deleteSubcategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SUBCATEGORIES_QUERY_KEY });
    },
  });
}
