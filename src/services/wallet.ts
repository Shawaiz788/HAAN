import { fetchWithAuth } from './fetchClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export interface UserWallet {
  id: number;
  user_id: number;
  amount: string | number;
  created_at?: string;
}

/**
 * Create a new wallet for a user.
 * POST /v1/wallet/
 */
export const createWalletForUser = async (userId: number): Promise<UserWallet> => {
  const url = `${API_URL}/v1/wallet/`;
  console.log('[Wallet API] Creating wallet for userId:', userId, 'via URL:', url);

  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount: '0.00' }),
  });

  const responseText = await response.text();
  console.log('[Wallet API] Create Status:', response.status);
  console.log('[Wallet API] Create Body:', responseText);

  if (!response.ok) {
    let errorMsg = `Failed to create wallet (Status ${response.status})`;
    try {
      const errObj = JSON.parse(responseText);
      if (errObj.detail) errorMsg = errObj.detail;
      else if (errObj.error) errorMsg = errObj.error;
      else if (errObj.message) errorMsg = errObj.message;
    } catch (e) {
      // Fallback error
    }
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse create wallet response: ${responseText}`);
  }
};

/**
 * Fetch wallet information for a specific user.
 * If wallet does not exist (404 or "No Wallet matches"), automatically creates one.
 * GET /v1/wallet/{user_id}/
 */
export const getWalletByUserId = async (userId: number): Promise<UserWallet> => {
  const url = `${API_URL}/v1/wallet/${userId}/`;
  console.log('[Wallet API] Fetching wallet for userId:', userId, 'via URL:', url);

  const response = await fetchWithAuth(url);
  const responseText = await response.text();

  console.log('[Wallet API] Status:', response.status);
  console.log('[Wallet API] Response Body:', responseText);

  if (!response.ok) {
    let isNotFound = response.status === 404;
    let errorMsg = `Failed to fetch wallet (Status ${response.status})`;

    try {
      const errObj = JSON.parse(responseText);
      if (errObj.detail) errorMsg = errObj.detail;
      else if (errObj.error) errorMsg = errObj.error;
      else if (errObj.message) errorMsg = errObj.message;
    } catch (e) {
      // Fallback
    }

    if (
      isNotFound ||
      errorMsg.toLowerCase().includes('no wallet matches') ||
      errorMsg.toLowerCase().includes('not found')
    ) {
      console.log('[Wallet API] Wallet does not exist for user. Automatically creating new wallet...');
      return await createWalletForUser(userId);
    }

    throw new Error(errorMsg);
  }

  try {
    const data = JSON.parse(responseText);
    // If backend returns array, take first item, else take object directly
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return data;
  } catch (e) {
    throw new Error(`Failed to parse wallet response: ${responseText}`);
  }
};
