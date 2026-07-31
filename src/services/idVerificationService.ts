import { createMMKV } from 'react-native-mmkv';
import {
  IdVerificationPayload,
  VerificationRecord,
  IdVerificationService,
} from '@/types/idVerification';
import { fetchWithAuth } from './fetchClient';

const storage = createMMKV();
const VERIFICATION_STORAGE_KEY = 'kaamkrwao_pro_id_verification_record';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const idVerificationService: IdVerificationService = {
  getVerificationStatus: async (userId: number): Promise<VerificationRecord> => {
    // 1. Try local cached MMKV state first
    try {
      const cachedRaw = storage.getString(`${VERIFICATION_STORAGE_KEY}_${userId}`);
      if (cachedRaw) {
        return JSON.parse(cachedRaw);
      }
    } catch (e) {
      console.warn('[IdVerificationService] Cache read warning:', e);
    }

    // 2. Attempt fetching from backend endpoint if available
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/pro/verification/status/`);
      if (response.ok) {
        const data = await response.json();
        const record: VerificationRecord = {
          status: data.status || 'unsubmitted',
          fullName: data.full_name,
          idNumber: data.id_number,
          cardType: data.card_type || 'cnic',
          frontUri: data.front_image_url,
          backUri: data.back_image_url,
          submittedAt: data.submitted_at,
          rejectionReason: data.rejection_reason,
        };
        storage.set(`${VERIFICATION_STORAGE_KEY}_${userId}`, JSON.stringify(record));
        return record;
      }
    } catch (e) {
      console.log('[IdVerificationService] Endpoint not available, using cached state:', e);
    }

    // Default fallback state
    return {
      status: 'unsubmitted',
    };
  },

  submitVerification: async (
    userId: number,
    payload: IdVerificationPayload
  ): Promise<VerificationRecord> => {
    const record: VerificationRecord = {
      status: 'pending',
      fullName: payload.fullName,
      idNumber: payload.idNumber,
      cardType: payload.cardType,
      frontUri: payload.frontUri,
      backUri: payload.backUri,
      submittedAt: new Date().toISOString(),
    };

    // Save locally to MMKV for immediate persistence
    try {
      storage.set(`${VERIFICATION_STORAGE_KEY}_${userId}`, JSON.stringify(record));
    } catch (e) {
      console.warn('[IdVerificationService] MMKV save warning:', e);
    }

    // Attempt submission to backend endpoint (gracefully handles missing endpoint)
    try {
      const formData = new FormData();
      if (payload.fullName) formData.append('full_name', payload.fullName);
      if (payload.idNumber) formData.append('id_number', payload.idNumber);
      formData.append('card_type', payload.cardType);

      if (payload.frontUri) {
        const frontFilename = payload.frontUri.split('/').pop() || 'id_front.jpg';
        formData.append('front_image', {
          uri: payload.frontUri,
          name: frontFilename,
          type: 'image/jpeg',
        } as any);
      }

      if (payload.backUri) {
        const backFilename = payload.backUri.split('/').pop() || 'id_back.jpg';
        formData.append('back_image', {
          uri: payload.backUri,
          name: backFilename,
          type: 'image/jpeg',
        } as any);
      }

      const response = await fetchWithAuth(`${API_URL}/v1/pro/verification/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const updatedRecord: VerificationRecord = {
          ...record,
          status: data.status || 'pending',
          submittedAt: data.submitted_at || record.submittedAt,
        };
        storage.set(`${VERIFICATION_STORAGE_KEY}_${userId}`, JSON.stringify(updatedRecord));
        return updatedRecord;
      }
    } catch (e) {
      console.log('[IdVerificationService] Backend submit endpoint not ready, saved locally:', e);
    }

    return record;
  },
};
