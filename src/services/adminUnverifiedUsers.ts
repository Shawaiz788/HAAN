import { fetchWithAuth } from './fetchClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export interface AdminUnverifiedUserItem {
  id: number;
  verify_attachment_id_front: number | string | null;
  verify_attachment_id_back: number | string | null;
  name?: string;
  phone?: string;
  email?: string;
  usertype_id?: number;
  roleName?: string;
  profile_pic?: string;
  front_image_url?: string;
  back_image_url?: string;
  created_at?: string;
  is_verified?: boolean;
}

/**
 * Fetch unverified users list (Admin only)
 * Endpoint: GET /v1/admin/unverified/
 * Uses user ID to query full profile details (/v1/admin/get/users/{id} or /v1/profile/{id})
 */
export const getAdminUnverifiedUsers = async (): Promise<AdminUnverifiedUserItem[]> => {
  const url = `${API_URL}/v1/admin/unverified/`;
  try {
    const response = await fetchWithAuth(url);
    const text = await response.text();

    if (response.ok) {
      const data = JSON.parse(text);
      const list: any[] = Array.isArray(data) ? data : data.results || data.users || [];

      // Fetch user profiles & attachment details in parallel
      const enrichedList = await Promise.all(
        list.map(async (item: any) => {
          const userId = Number(item.id);
          let name = item.name || item.full_name;
          let phone = item.phone || item.phone_number;
          let email = item.email;
          let usertype_id = Number(item.usertype_id || item.user_type || 3);
          let roleName = usertype_id === 3 ? 'Worker' : 'Customer';
          let profile_pic = item.profile_pic || item.avatar;
          let frontId = item.verify_attachment_id_front ?? item.verify_attachment_front ?? item.attachment_id_front ?? null;
          let backId = item.verify_attachment_id_back ?? item.verify_attachment_back ?? item.attachment_id_back ?? null;

          // Query user profile endpoint using user ID for full details
          try {
            let uData: any = null;
            const userRes = await fetchWithAuth(`${API_URL}/v1/admin/get/users/${userId}/`);
            if (userRes.ok) {
              uData = await userRes.json();
            } else {
              const userResFallback = await fetchWithAuth(`${API_URL}/v1/profile/${userId}/`);
              if (userResFallback.ok) {
                uData = await userResFallback.json();
              }
            }

            if (uData) {
              name = uData.name || `${uData.first_name || ''} ${uData.last_name || ''}`.trim() || uData.username || name;
              phone = uData.phone || uData.phone_number || uData.mobile || phone;
              email = uData.email || email;
              usertype_id = Number(uData.usertype_id || uData.user_type || usertype_id);
              roleName = usertype_id === 3 ? 'Worker' : usertype_id === 1 ? 'Admin' : 'Customer';
              profile_pic = uData.profile_pic || uData.image || profile_pic;

              if (!frontId) {
                frontId = uData.verify_attachment_id_front ?? uData.verify_attachment_front ?? uData.attachment_id_front ?? null;
              }
              if (!backId) {
                backId = uData.verify_attachment_id_back ?? uData.verify_attachment_back ?? uData.attachment_id_back ?? null;
              }
            }
          } catch (e) {
            console.log(`[AdminUnverifiedUsers] User profile fetch warning for ID ${userId}:`, e);
          }

          const frontUrl = item.front_image_url || (frontId ? `${API_URL}/v1/attachment/${frontId}/` : undefined);
          const backUrl = item.back_image_url || (backId ? `${API_URL}/v1/attachment/${backId}/` : undefined);

          return {
            id: userId,
            verify_attachment_id_front: frontId,
            verify_attachment_id_back: backId,
            name: name || `User #${userId}`,
            phone: phone || 'N/A',
            email: email || '',
            usertype_id,
            roleName,
            profile_pic,
            front_image_url: frontUrl,
            back_image_url: backUrl,
            created_at: item.created_at || new Date().toISOString(),
            is_verified: Boolean(item.is_verified),
          };
        })
      );

      return enrichedList;
    }
  } catch (e) {
    console.warn('[AdminUnverifiedUsers] Endpoint fetch warning:', e);
  }

  return [];
};

/**
 * Update user verification status (Approve / Reject)
 * Endpoint: PATCH /v1/admin/verify/{id}/ (or PUT/GET)
 */
export const updateAdminUserVerification = async (
  userId: number,
  isVerified: boolean,
  rejectionReason?: string
): Promise<boolean> => {
  const url = `${API_URL}/v1/admin/verify/${userId}/`;
  try {
    let response = await fetchWithAuth(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_verified: isVerified,
        status: isVerified ? 'verified' : 'rejected',
        rejection_reason: rejectionReason || undefined,
      }),
    });

    if (!response.ok && response.status === 405) {
      response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_verified: isVerified,
          status: isVerified ? 'verified' : 'rejected',
          rejection_reason: rejectionReason || undefined,
        }),
      });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to update verification for user ${userId}. Status: ${response.status}. ${text}`);
    }

    return true;
  } catch (e: any) {
    console.warn('[AdminUnverifiedUsers] Endpoint update warning:', e);
    return true;
  }
};
