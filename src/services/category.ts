import { fetchWithAuth } from './fetchClient';
import { Category, SubCategory, CreateCategoryPayload, CreateSubCategoryPayload } from '@/types/category';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const categoryService = {
  // ── Category Endpoints ──────────────────────────────────────────────────────
  getCategories: async (): Promise<Category[]> => {
    const response = await fetchWithAuth(`${API_URL}/app/category/`);
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch categories. Status: ${response.status}`);
    }
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.results || [];
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<Category> => {
    const response = await fetchWithAuth(`${API_URL}/app/category/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to create category. Status: ${response.status}. Details: ${text}`);
    }
    return JSON.parse(text);
  },

  updateCategory: async (id: number, payload: Partial<CreateCategoryPayload>): Promise<Category> => {
    const response = await fetchWithAuth(`${API_URL}/app/category/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to update category ${id}. Status: ${response.status}. Details: ${text}`);
    }
    return JSON.parse(text);
  },

  deleteCategory: async (id: number): Promise<boolean> => {
    const response = await fetchWithAuth(`${API_URL}/app/category/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete category ${id}. Status: ${response.status}. Details: ${text}`);
    }
    return true;
  },

  // ── SubCategory Endpoints ──────────────────────────────────────────────────
  getSubcategories: async (): Promise<SubCategory[]> => {
    const response = await fetchWithAuth(`${API_URL}/app/subcategory/`);
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch subcategories. Status: ${response.status}`);
    }
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.results || [];
  },

  createSubcategory: async (payload: CreateSubCategoryPayload): Promise<SubCategory> => {
    const response = await fetchWithAuth(`${API_URL}/app/subcategory/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to create subcategory. Status: ${response.status}. Details: ${text}`);
    }
    return JSON.parse(text);
  },

  updateSubcategory: async (id: number, payload: Partial<CreateSubCategoryPayload>): Promise<SubCategory> => {
    const response = await fetchWithAuth(`${API_URL}/app/subcategory/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to update subcategory ${id}. Status: ${response.status}. Details: ${text}`);
    }
    return JSON.parse(text);
  },

  deleteSubcategory: async (id: number): Promise<boolean> => {
    const response = await fetchWithAuth(`${API_URL}/app/subcategory/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete subcategory ${id}. Status: ${response.status}. Details: ${text}`);
    }
    return true;
  },
};
