import {
  IdVerificationPayload,
  VerificationRecord,
  IdVerificationService,
} from '@/types/idVerification';
import { fetchWithAuth } from './fetchClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

/**
 * Upload a single attachment file to POST /v1/attachment/
 * Returns attachment ID
 */
export const createSingleAttachment = async (uri: string): Promise<number | string> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'cnic_doc.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  formData.append('task_id', '1');
  formData.append('task', '1');

  const response = await fetchWithAuth(`${API_URL}/v1/attachment/`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Status ${response.status}: ${responseText || 'File upload rejected by server'}`);
  }

  const data = JSON.parse(responseText);
  const attachmentId = data.id || data.attachment_id || (Array.isArray(data) ? data[0]?.id : null);
  if (!attachmentId) {
    throw new Error(`Attachment upload response did not include ID: ${responseText}`);
  }
  return attachmentId;
};

export const idVerificationService: IdVerificationService = {
  getVerificationStatus: async (userId: number): Promise<VerificationRecord> => {
    const url = `${API_URL}/v1/profile/${userId}/`;

    try {
      const response = await fetchWithAuth(url);
      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);

        const frontId =
          data.verify_attachment_id_front ??
          data.verify_attachment_front ??
          data.attachment_id_front ??
          null;

        const backId =
          data.verify_attachment_id_back ??
          data.verify_attachment_back ??
          data.attachment_id_back ??
          null;

        // Strict boolean check (handles boolean true, string "true", integer 1)
        let isVerifiedBool =
          data.is_verified === true ||
          data.is_verified === 'true' ||
          data.is_verified === 1 ||
          data.verified === true ||
          data.verified === 'true' ||
          data.verified === 1;

        if (!isVerifiedBool) {
          try {
            const vRes = await fetchWithAuth(`${API_URL}/v1/admin/verify/${userId}/`);
            if (vRes.ok) {
              const vData = await vRes.json();
              if (vData.is_verified === true || vData.is_verified === 'true' || vData.is_verified === 1) {
                isVerifiedBool = true;
              }
            }
          } catch {
            // ignore fallback
          }
        }

        let status: 'unsubmitted' | 'pending' | 'verified' | 'rejected' = 'unsubmitted';
        if (isVerifiedBool) {
          status = 'verified';
        } else if (data.status === 'rejected' || data.rejection_reason) {
          status = 'rejected';
        } else if (frontId || backId) {
          status = 'pending';
        }

        return {
          status,
          fullName: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          idNumber: data.id_number,
          cardType: data.card_type || 'cnic',
          frontUri: frontId ? `${API_URL}/v1/attachment/${frontId}/` : undefined,
          backUri: backId ? `${API_URL}/v1/attachment/${backId}/` : undefined,
          submittedAt: data.submitted_at || new Date().toISOString(),
          rejectionReason: data.rejection_reason,
        };
      }
    } catch (e) {
      console.warn('[IdVerificationService] Profile status fetch warning:', e);
    }

    return {
      status: 'unsubmitted',
    };
  },

  submitVerification: async (
    userId: number,
    payload: IdVerificationPayload
  ): Promise<VerificationRecord> => {
    // 1. Upload Front Attachment if present
    let frontAttachmentId: number | string | null = null;
    if (payload.frontUri && !payload.frontUri.startsWith('http')) {
      try {
        frontAttachmentId = await createSingleAttachment(payload.frontUri);
      } catch (e: any) {
        throw new Error(`CNIC Front photo upload failed (${e?.message || 'Server error'}). Please re-select/capture photo and try again.`);
      }
    }

    // 2. Upload Back Attachment if present
    let backAttachmentId: number | string | null = null;
    if (payload.backUri && !payload.backUri.startsWith('http')) {
      try {
        backAttachmentId = await createSingleAttachment(payload.backUri);
      } catch (e: any) {
        throw new Error(`CNIC Back photo upload failed (${e?.message || 'Server error'}). Please re-select/capture photo and try again.`);
      }
    }

    // 3. Update User Profile using /v1/user/add-verify/ endpoint
    const profilePayload: Record<string, any> = {};
    if (frontAttachmentId) profilePayload.verify_attachment_id_front = frontAttachmentId;
    if (backAttachmentId) profilePayload.verify_attachment_id_back = backAttachmentId;

    if (Object.keys(profilePayload).length > 0) {
      const addVerifyUrl = `${API_URL}/v1/user/add-verify/`;

      let profileRes = await fetchWithAuth(addVerifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      if (!profileRes.ok && (profileRes.status === 405 || profileRes.status === 404)) {
        profileRes = await fetchWithAuth(addVerifyUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
        });
      }

      if (!profileRes.ok && (profileRes.status === 405 || profileRes.status === 404)) {
        const noSlashUrl = `${API_URL}/v1/user/add-verify`;
        profileRes = await fetchWithAuth(noSlashUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
        });
      }

      if (!profileRes.ok && (profileRes.status === 405 || profileRes.status === 404)) {
        const legacyUrl = `${API_URL}/v1/update/user/`;
        profileRes = await fetchWithAuth(legacyUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
        });
      }

      const responseText = await profileRes.text();

      if (!profileRes.ok) {
        throw new Error(`Failed to update profile verification IDs (Status ${profileRes.status}): ${responseText}`);
      }

      return {
        status: 'pending',
        fullName: payload.fullName,
        idNumber: payload.idNumber,
        cardType: payload.cardType,
        frontUri: payload.frontUri,
        backUri: payload.backUri,
        submittedAt: new Date().toISOString(),
      };
    } else {
      throw new Error('No new CNIC attachments were selected to upload. Please capture or select front and back photos.');
    }
  },
};
