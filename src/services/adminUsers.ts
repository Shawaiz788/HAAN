import { fetchWithAuth } from './fetchClient';
import { User } from '@/types';
import { AdminUserItem, ProDetails } from '@/types/admin';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export interface CreateAdminUserPayload {
  phone: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  usertype_id?: number;
}

/**
 * Create a new user (Admin, Worker, or Customer)
 * Endpoint: POST /v1/register/
 */
export const createAdminUser = async (payload: CreateAdminUserPayload): Promise<AdminUserItem> => {
  const url = `${API_URL}/v1/register/`;
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: payload.phone,
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      email: payload.email || '',
      password: payload.password || 'Kaam12345!',
      usertype_id: payload.usertype_id || 2,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create user. Status: ${response.status}. ${text}`);
  }

  const u = JSON.parse(text);
  const userTypeId = Number(u.usertype_id || u.user_type || u.role_id || payload.usertype_id || 2);
  let roleName = 'Customer';
  if (userTypeId === 1) roleName = 'Admin';
  if (userTypeId === 3) roleName = 'Worker';

  return {
    id: Number(u.id || Date.now()),
    name: u.name || `${u.first_name || payload.first_name || ''} ${u.last_name || payload.last_name || ''}`.trim() || `User #${u.id}`,
    phone: u.phone || payload.phone || 'N/A',
    email: u.email || payload.email || '',
    usertype_id: userTypeId,
    roleName: roleName,
    status: 'active',
    verified: Boolean(u.is_verified || u.verified),
    rating: 5.0,
    totalTasks: 0,
    joinedDate: 'Just Now',
  };
};

export interface PaginatedAdminUsersResponse {
  users: AdminUserItem[];
  hasMore: boolean;
  totalCount: number;
  page: number;
}

/**
 * Fetch paginated list of all platform users for Admin Dashboard
 * Endpoint: /v1/admin/get/users/?page=X&page_size=Y
 */
export const getAdminUsers = async (
  page = 1,
  pageSize = 20
): Promise<PaginatedAdminUsersResponse> => {
  const url = `${API_URL}/v1/admin/get/users/?page=${page}&page_size=${pageSize}`;
  const response = await fetchWithAuth(url);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) {
      return { users: [], hasMore: false, totalCount: 0, page };
    }
    throw new Error(`Failed to fetch admin users list. Status: ${response.status}`);
  }

  const data = JSON.parse(text);
  const rawList: any[] = Array.isArray(data)
    ? data
    : data.results || data.users || data.data || [];
  const totalCount = Number(data.count || data.total || data.total_count || rawList.length);
  const hasMore = Boolean(data.next) || (rawList.length === pageSize && page * pageSize < totalCount);

  const users: AdminUserItem[] = rawList.map((u: any) => {
    const userTypeId = Number(u.usertype_id || u.user_type || u.role_id || 2);
    let roleName = 'Customer';
    if (userTypeId === 1) roleName = 'Admin';
    if (userTypeId === 3) roleName = 'Worker';

    return {
      id: Number(u.id),
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `User #${u.id}`,
      phone: u.phone || u.phone_number || u.mobile || 'N/A',
      email: u.email || '',
      usertype_id: userTypeId,
      roleName: roleName,
      status: u.is_active === false || u.status === 'suspended' ? 'suspended' : 'active',
      profile_pic: u.profile_pic || u.image || u.avatar || undefined,
      verified: Boolean(u.is_verified || u.verified),
      rating: Number(u.rating || u.overall_rating || 5.0),
      totalTasks: Number(u.total_tasks || u.tasks_count || 0),
      joinedDate: u.created_at
        ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Jan 2026',
    };
  });

  return {
    users,
    hasMore,
    totalCount,
    page,
  };
};

/**
 * Fetch specific user details by ID for Admin
 * Endpoint: /v1/admin/get/users/{id}
 */
export const getAdminUserById = async (id: number): Promise<AdminUserItem | null> => {
  const response = await fetchWithAuth(`${API_URL}/v1/admin/get/users/${id}`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch admin user ${id}. Status: ${response.status}`);
  }

  const u = JSON.parse(text);
  const userTypeId = Number(u.usertype_id || u.user_type || u.role_id || 2);
  let roleName = 'Customer';
  if (userTypeId === 1) roleName = 'Admin';
  if (userTypeId === 3) roleName = 'Worker';

  return {
    id: Number(u.id),
    name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `User #${u.id}`,
    phone: u.phone || u.phone_number || u.mobile || 'N/A',
    email: u.email || '',
    usertype_id: userTypeId,
    roleName: roleName,
    status: u.is_active === false || u.status === 'suspended' ? 'suspended' : 'active',
    profile_pic: u.profile_pic || u.image || u.avatar || undefined,
    verified: Boolean(u.is_verified || u.verified),
    rating: Number(u.rating || u.overall_rating || 5.0),
    totalTasks: Number(u.total_tasks || u.tasks_count || 0),
    joinedDate: u.created_at
      ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Jan 2026',
  };
};

/**
 * Update specific user's profile attributes as Admin
 * Endpoint: PATCH /v1/admin/get/users/{id}/
 */
export const updateAdminUserById = async (
  id: number,
  payload: Partial<AdminUserItem> & Record<string, any>
): Promise<AdminUserItem> => {
  const url = `${API_URL}/v1/admin/get/users/${id}/`;
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update user ${id}. Status: ${response.status}. ${text}`);
  }

  const u = JSON.parse(text);
  const userTypeId = Number(u.usertype_id || u.user_type || u.role_id || 2);
  let roleName = 'Customer';
  if (userTypeId === 1) roleName = 'Admin';
  if (userTypeId === 3) roleName = 'Worker';

  return {
    id: Number(u.id || id),
    name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `User #${id}`,
    phone: u.phone || u.phone_number || u.mobile || 'N/A',
    email: u.email || '',
    usertype_id: userTypeId,
    roleName: roleName,
    status: u.is_active === false || u.status === 'suspended' ? 'suspended' : 'active',
    profile_pic: u.profile_pic || u.image || u.avatar || undefined,
    verified: Boolean(u.is_verified || u.verified),
    rating: Number(u.rating || u.overall_rating || 5.0),
    totalTasks: Number(u.total_tasks || u.tasks_count || 0),
    joinedDate: u.created_at
      ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Jan 2026',
  };
};

/**
 * Soft-delete specific user profile as Admin
 * Endpoint: DELETE /v1/admin/get/users/{id}/delete/
 */
export const deleteAdminUser = async (id: number): Promise<boolean> => {
  let response = await fetchWithAuth(`${API_URL}/v1/admin/get/users/${id}/delete/`, {
    method: 'DELETE',
  });
  
  if (!response.ok && (response.status === 405 || response.status === 404)) {
    // Retry without trailing slash if required by backend URL router
    response = await fetchWithAuth(`${API_URL}/v1/admin/get/users/${id}/delete`, {
      method: 'DELETE',
    });
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`Failed to delete admin user ${id}. Status: ${response.status}. ${responseText}`);
  }
  return true;
};

export const getUserProfile = async (id: number): Promise<AdminUserItem> => {
  const user = await getAdminUserById(id);
  if (user) return user;

  const response = await fetchWithAuth(`${API_URL}/v1/profile/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile (${id}). Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const updateAdminUser = async (id: number, data: Partial<User>): Promise<User> => {
  const response = await fetchWithAuth(`${API_URL}/v1/update/user/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update user. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const updateAdminUserImage = async (uri: string): Promise<any> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'profile.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', { uri, name: filename, type } as any);

  const response = await fetchWithAuth(`${API_URL}/v1/update/user/image/`, {
    method: 'PATCH',
    body: formData,
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update user image. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const getVerificationStatus = async (id: number): Promise<any> => {
  const response = await fetchWithAuth(`${API_URL}/v1/verify/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    return { is_verified: false };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { is_verified: false };
  }
};

export const verifyUserStatus = async (id: number, isVerified: boolean): Promise<any> => {
  const response = await fetchWithAuth(`${API_URL}/v1/verify/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_verified: isVerified }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to verify user. Status: ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { is_verified: isVerified };
  }
};

export const getUserRating = async (userId: number): Promise<{ rating: number; count: number }> => {
  const response = await fetchWithAuth(`${API_URL}/v1/review/rating/${userId}/`);
  const text = await response.text();
  if (!response.ok) {
    return { rating: 5.0, count: 0 };
  }
  try {
    const data = JSON.parse(text);
    return {
      rating: Number(data.rating || data.overall_rating || 5.0),
      count: Number(data.count || data.total_reviews || 0),
    };
  } catch {
    return { rating: 5.0, count: 0 };
  }
};
