const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';
import { fetchWithTimeout, fetchWithAuth } from './fetchClient';
import * as SecureStore from 'expo-secure-store';
import { User, UserType, UserLocation } from '@/types';

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
    console.log('[createUser API] Sending payload:', JSON.stringify(user, null, 2));
    const response = await fetchWithTimeout(`${API_URL}/app/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });

    const responseText = await response.text();
    console.log('[createUser API] Response Status:', response.status);
    console.log('[createUser API] Response Body:', responseText);

    if (!response.ok) {
        if (response.status === 400) {
            try {
                const data = JSON.parse(responseText);
                if (data) {
                    if (data.phone_number) {
                        throw new Error('Phone number is already registered.');
                    }
                    if (data.email) {
                        throw new Error('Email address is already registered.');
                    }
                }
            } catch (e: any) {
                if (e.message === 'Phone number is already registered.' || e.message === 'Email address is already registered.') {
                    throw e;
                }
            }
            throw new Error('Invalid registration details. Please verify your fields.');
        }
        if (response.status === 404) {
            throw new Error('The registration server could not be reached (404). Please try again later.');
        }
        if (response.status >= 500) {
            throw new Error('The server is temporarily busy or undergoing maintenance. Please try again in a few moments (5xx).');
        }
        throw new Error(`Registration failed. Status: ${response.status}. Please check your details and try again.`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse user response as JSON. Content: ${responseText}`);
    }
};



export const loginUser = async (phone_number: string, password: string): Promise<User> => {
    const url = `${API_URL}/app/login/`;
    console.log('[loginUser API] Logging in via URL:', url);
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number, password }),
    });
    const responseText = await response.text();
    console.log('[loginUser API] Response Status:', response.status);
    console.log('[loginUser API] Response Body:', responseText);

    if (!response.ok) {
        if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new Error('Invalid phone number or password. Please try again.');
        }
        if (response.status === 404) {
            throw new Error('The login server could not be reached (404). Please try again later.');
        }
        if (response.status >= 500) {
            throw new Error('The server is temporarily busy or undergoing maintenance. Please try again in a few moments (5xx).');
        }
        throw new Error(`Login failed. Status: ${response.status}. Please check your details and try again.`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e: any) {
        throw new Error(`Failed to parse login response as JSON. Error: ${e.message}. Content: ${responseText}`);
    }
};

// Verify user account on backend using their user ID and optional JWT access token
export const verifyUserOnBackend = async (userId: number): Promise<any> => {
    const url = `${API_URL}/app/user/${userId}/verify/`;
    console.log('[verifyUserOnBackend] Verifying account via URL:', url);
    const response = await fetchWithAuth(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_verified: true }),
    });

    const responseText = await response.text();
    console.log('[verifyUserOnBackend] Response Status:', response.status);
    console.log('[verifyUserOnBackend] Response Body:', responseText);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('The verification server could not be reached (404). Please try again later.');
        }
        if (response.status >= 500) {
            throw new Error('The server is temporarily busy or undergoing maintenance. Please try again in a few moments (5xx).');
        }
        throw new Error(`Verification failed on backend. Status: ${response.status}.`);
    }

    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch (e) {
        return { message: responseText };
    }
};

// Check if a phone number is already registered in the system (returns true if exists, false otherwise)
export const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    const url = `${API_URL}/app/register/`;
    console.log('[checkPhoneExists] Checking phone existence via URL:', url);
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone_number: phoneNumber }),
        });

        const responseText = await response.text();
        console.log('[checkPhoneExists] Response Status:', response.status);
        console.log('[checkPhoneExists] Response Body:', responseText);

        if (response.status === 400) {
            try {
                const data = JSON.parse(responseText);
                if (data && data.phone_number) {
                    const errors = Array.isArray(data.phone_number) ? data.phone_number : [data.phone_number];
                    const hasExistsError = errors.some((err: string) =>
                        err.toLowerCase().includes('exist') ||
                        err.toLowerCase().includes('unique')
                    );
                    if (hasExistsError) {
                        return true; // Phone number already registered!
                    }
                }
                // If it is status 400 but phone_number is not flagged as existing,
                // the number is available (other fields are just missing).
                return false;
            } catch (e) {
                console.error('[checkPhoneExists] Failed to parse JSON error response:', e);
            }
        }
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('The registration server could not be reached (404). Please try again later.');
            }
            if (response.status >= 500) {
                throw new Error('The server is temporarily busy or undergoing maintenance. Please try again in a few moments (5xx).');
            }
            throw new Error(`Check failed. Status: ${response.status}`);
        }
        return false;
    } catch (error: any) {
        console.error('[checkPhoneExists] Connection error during check:', error);
        throw error;
    }
};

export const updateUserOnBackend = async (
    userId: number,
    userDetails: Partial<User>
): Promise<User> => {
    //console.log(`[user API] Updating user details on backend for User ID: ${userId}`, userDetails);

    const response = await fetchWithAuth(`${API_URL}/app/update/user/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
    });
    const responseText = await response.text();
    // console.log('[user API] Update user response status:', response.status);

    if (!response.ok) {
        throw new Error(`Failed to update profile on backend. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse profile update response as JSON. Content: ${responseText}`);
    }
};

export const updateProfilePic = async (
    uri: string
): Promise<User> => {
    //console.log(`[user API] Uploading profile picture from uri: ${uri}`);
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', {
        uri,
        name: filename,
        type,
    } as any);

    const response = await fetchWithAuth(`${API_URL}/app/update/user/image/`, {
        method: 'PATCH',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    });

    const responseText = await response.text();
    // console.log('[user API] Update profile pic response status:', response.status);
    // console.log('[user API] Update profile pic response body:', responseText);

    if (!response.ok) {
        throw new Error(`Failed to update profile picture on backend. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        const parsed = JSON.parse(responseText);
        //console.log('[user API] Parsed profile pic response:', JSON.stringify(parsed));
        return parsed;
    } catch (e) {
        throw new Error(`Failed to parse profile picture update response. Content: ${responseText}`);
    }
};

const customerReviewsCache = new Map<number, { data: any[]; timestamp: number }>();
const REVIEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const getUserReviews = async (userId: number, forceRefresh = false): Promise<any[]> => {
    const cached = customerReviewsCache.get(userId);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < REVIEWS_CACHE_TTL)) {
        return cached.data;
    }

    //console.log(`[user API] Fetching reviews list from /app/review/ for user ID: ${userId}`);
    const response = await fetchWithAuth(`${API_URL}/app/review/`);
    const responseText = await response.text();
    //console.log('[user API] Get reviews status:', response.status);

    if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Failed to fetch reviews. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        const data = JSON.parse(responseText);
        const allReviews: any[] = Array.isArray(data) ? data : (data.results || data.reviews || []);
        // Filter reviews for target user
        const userReviews = allReviews.filter((r: any) => Number(r.user_id) === Number(userId));
        customerReviewsCache.set(userId, { data: userReviews, timestamp: Date.now() });
        return userReviews;
    } catch (e) {
        throw new Error(`Failed to parse reviews response. Content: ${responseText}`);
    }
};

export const getCustomerReviews = getUserReviews;