import { fetchWithAuth, API_URL } from './fetchClient';

async function fetchList<T>(endpoint: string): Promise<T[]> {
  const response = await fetchWithAuth(`${API_URL}/app/${endpoint}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch ${endpoint}. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
}

async function createItem<T>(endpoint: string, payload: any): Promise<T> {
  const response = await fetchWithAuth(`${API_URL}/app/${endpoint}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create ${endpoint}. Status: ${response.status}. Details: ${text}`);
  }
  return JSON.parse(text);
}

async function getItemById<T>(endpoint: string, id: number): Promise<T | null> {
  const response = await fetchWithAuth(`${API_URL}/app/${endpoint}/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch ${endpoint} ${id}. Status: ${response.status}. Details: ${text}`);
  }
  return JSON.parse(text);
}

async function updateItem<T>(endpoint: string, id: number, payload: any): Promise<T> {
  const response = await fetchWithAuth(`${API_URL}/app/${endpoint}/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update ${endpoint} ${id}. Status: ${response.status}. Details: ${text}`);
  }
  return JSON.parse(text);
}

async function deleteItem(endpoint: string, id: number): Promise<boolean> {
  const response = await fetchWithAuth(`${API_URL}/app/${endpoint}/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete ${endpoint} ${id}. Status: ${response.status}. Details: ${text}`);
  }
  return true;
}

// Master Data Service Facade
export const masterDataService = {
  // Categories
  getCategories: () => fetchList<any>('category'),
  createCategory: (payload: any) => createItem<any>('category', payload),
  getCategoryById: (id: number) => getItemById<any>('category', id),
  updateCategory: (id: number, payload: any) => updateItem<any>('category', id, payload),
  deleteCategory: (id: number) => deleteItem('category', id),

  // Subcategories
  getSubcategories: () => fetchList<any>('sub/category'),
  createSubcategory: (payload: any) => createItem<any>('sub/category', payload),
  getSubcategoryById: (id: number) => getItemById<any>('sub/category', id),
  updateSubcategory: (id: number, payload: any) => updateItem<any>('sub/category', id, payload),
  deleteSubcategory: (id: number) => deleteItem('sub/category', id),

  // Countries
  getCountries: () => fetchList<any>('country'),
  createCountry: (payload: any) => createItem<any>('country', payload),
  getCountryById: (id: number) => getItemById<any>('country', id),
  updateCountry: (id: number, payload: any) => updateItem<any>('country', id, payload),
  deleteCountry: (id: number) => deleteItem('country', id),

  // Cities
  getCities: () => fetchList<any>('city'),
  createCity: (payload: any) => createItem<any>('city', payload),
  getCityById: (id: number) => getItemById<any>('city', id),
  updateCity: (id: number, payload: any) => updateItem<any>('city', id, payload),
  deleteCity: (id: number) => deleteItem('city', id),

  // Areas
  getAreas: () => fetchList<any>('area'),
  createArea: (payload: any) => createItem<any>('area', payload),
  getAreaById: (id: number) => getItemById<any>('area', id),
  updateArea: (id: number, payload: any) => updateItem<any>('area', id, payload),
  deleteArea: (id: number) => deleteItem('area', id),

  // Locations
  getLocations: () => fetchList<any>('location'),
  createLocation: (payload: any) => createItem<any>('location', payload),
  getLocationById: (id: number) => getItemById<any>('location', id),
  updateLocation: (id: number, payload: any) => updateItem<any>('location', id, payload),
  deleteLocation: (id: number) => deleteItem('location', id),

  // User Types
  getUserTypes: () => fetchList<any>('usertype'),
  createUserType: (payload: any) => createItem<any>('usertype', payload),
  getUserTypeById: (id: number) => getItemById<any>('usertype', id),
  updateUserType: (id: number, payload: any) => updateItem<any>('usertype', id, payload),
  deleteUserType: (id: number) => deleteItem('usertype', id),

  // Payment Preferences
  getPaymentPrefs: () => fetchList<any>('paymentpref'),
  createPaymentPref: (payload: any) => createItem<any>('paymentpref', payload),
  getPaymentPrefById: (id: number) => getItemById<any>('paymentpref', id),
  updatePaymentPref: (id: number, payload: any) => updateItem<any>('paymentpref', id, payload),
  deletePaymentPref: (id: number) => deleteItem('paymentpref', id),

  // Statuses
  getStatuses: () => fetchList<any>('status'),
  createStatus: (payload: any) => createItem<any>('status', payload),
  getStatusById: (id: number) => getItemById<any>('status', id),
  updateStatus: (id: number, payload: any) => updateItem<any>('status', id, payload),
  deleteStatus: (id: number) => deleteItem('status', id),

  // Configuration
  getConfigs: () => fetchList<any>('config'),
  createConfig: (payload: any) => createItem<any>('config', payload),
  getConfigById: (id: number) => getItemById<any>('config', id),
  updateConfig: (id: number, payload: any) => updateItem<any>('config', id, payload),
  deleteConfig: (id: number) => deleteItem('config', id),
};
