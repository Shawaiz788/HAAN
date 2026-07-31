import { fetchWithTimeout, fetchWithAuth, API_URL } from './fetchClient';
import { User, UserLocation } from '@/types';
import { logger } from '@/utils/logger';

export interface LoginResponse {
    id: number;
    first_name: string;
    last_name: string;
    phone_number?: string;
    email: string;
    gender: string;
    usertype_id: number;
    location_id?: number;
    overall_rating?: number;
    profile_pic?: string;
    image?: string;
    access?: string;
    access_token?: string;
    token?: string;
    refresh?: string;
    refresh_token?: string;
    user?: User;
}

export interface CreateUserResponse extends User {
    access?: string;
    access_token?: string;
    token?: string;
    refresh?: string;
    refresh_token?: string;
}

export const createUser = async (user: Omit<User, 'id'>): Promise<CreateUserResponse> => {
    logger.log('[createUser API] Sending payload:', JSON.stringify(user, null, 2));
    const response = await fetchWithTimeout(`${API_URL}/v1/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });

    const responseText = await response.text();
    logger.log('[createUser API] Response Status:', response.status);

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

export const loginUser = async (phone_number: string, password: string): Promise<LoginResponse> => {
    const url = `${API_URL}/v1/login/`;
    logger.log('[loginUser API] Logging in via URL:', url);
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number, password }),
    });
    const responseText = await response.text();
    // logger.log('[loginUser API] Response Status:', response.status);
    // logger.log('[loginUser API] Response Body:', responseText);


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

export interface VerifyUserResponse {
    message?: string;
    is_verified?: boolean;
}

// Verify user account on backend using their user ID
export const verifyUserOnBackend = async (userId: number): Promise<VerifyUserResponse> => {
    const url = `${API_URL}/v1/user/${userId}/verify/`;
    logger.log('[verifyUserOnBackend] Verifying account via URL:', url);
    const response = await fetchWithAuth(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_verified: true }),
    });

    const responseText = await response.text();
    logger.log('[verifyUserOnBackend] Response Status:', response.status);

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

/**
 * Checks if a phone number is already registered in the system using Django CheckPhoneNumberView.
 * Django View expects: GET ...?phone_number=<phone>
 * Django Response: {"phone_number": "...", "is_registered": boolean}
 */
export const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    const cleanPhone = phoneNumber.trim();
    const encodedPhone = encodeURIComponent(cleanPhone);

    let url = `${API_URL}/v1/user/phone/?phone_number=${encodedPhone}`;
    logger.log('[checkPhoneExists] Request URL:', url);

    try {
        let response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 404) {
            const candidates = [
                `${API_URL}/v1/user/check-phone/?phone_number=${encodedPhone}`,
                `${API_URL}/v1/check-phone/?phone_number=${encodedPhone}`,
                `${API_URL}/check-phone/?phone_number=${encodedPhone}`,
            ];
            for (const candidate of candidates) {
                logger.log('[checkPhoneExists] Retrying with candidate URL:', candidate);
                const res = await fetchWithTimeout(candidate, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (res.status !== 404) {
                    response = res;
                    url = candidate;
                    break;
                }
            }
        }

        const responseText = await response.text();
        logger.log('[checkPhoneExists] Final Response Status:', response.status);
        logger.log('[checkPhoneExists] Response Body:', responseText);

        if (response.status === 200) {
            try {
                const data = JSON.parse(responseText);
                logger.log('[checkPhoneExists] Parsed Response Data:', data);

                if (typeof data.is_registered === 'boolean') {
                    return data.is_registered;
                }
                if (typeof data.exists === 'boolean') {
                    return data.exists;
                }
            } catch (e) {
                logger.error('[checkPhoneExists] JSON parse error:', e);
            }
        }

        if (response.status === 400) {
            try {
                const data = JSON.parse(responseText);
                if (data && typeof data.is_registered === 'boolean') return data.is_registered;
            } catch { }
        }

        return false;
    } catch (error: any) {
        logger.error('[checkPhoneExists] Error checking phone existence:', error);
        throw error;
    }
};

export const updateUserOnBackend = async (
    userId: number,
    userDetails: Partial<User>
): Promise<User> => {
    const response = await fetchWithAuth(`${API_URL}/v1/update/user/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
    });
    const responseText = await response.text();

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
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', {
        uri,
        name: filename,
        type,
    } as any);

    const response = await fetchWithAuth(`${API_URL}/v1/update/user/image/`, {
        method: 'PATCH',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Failed to update profile picture on backend. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse profile picture update response. Content: ${responseText}`);
    }
};

export interface UserReview {
    id: number;
    user_id: number;
    task_id: number;
    given_by: number;
    body: string;
    rating: number;
    attachment_id?: number | null;
    created_at?: string;
}

const customerReviewsCache = new Map<number, { data: UserReview[]; timestamp: number }>();
const REVIEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const getUserReviews = async (userId: number, forceRefresh = false): Promise<UserReview[]> => {
    const cached = customerReviewsCache.get(userId);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < REVIEWS_CACHE_TTL)) {
        return cached.data;
    }

    const response = await fetchWithAuth(`${API_URL}/v1/review/`);
    const responseText = await response.text();

    if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Failed to fetch reviews. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        const data = JSON.parse(responseText);
        const allReviews: UserReview[] = Array.isArray(data) ? data : (data.results || data.reviews || []);
        const userReviews = allReviews.filter((r) => Number((r as any).user_id || (r as any).user) === Number(userId));
        customerReviewsCache.set(userId, { data: userReviews, timestamp: Date.now() });
        return userReviews;
    } catch (e) {
        throw new Error(`Failed to parse reviews response. Content: ${responseText}`);
    }
};

export const getUserReviewCount = async (userId: number): Promise<number> => {
    try {
        const url = `${API_URL}/v1/review/customer/${userId}/`;
        const response = await fetchWithAuth(url);
        if (!response.ok) {
            // logger.warn(`[getUserReviewCount] Non-OK status ${response.status} from ${url}, falling back to getUserReviews`);
            const reviews = await getUserReviews(userId);
            return reviews.length;
        }

        const text = await response.text();
        // logger.log(`[getUserReviewCount] Response text for user ${userId}:`, text);
        const data = JSON.parse(text);

        if (typeof data === 'number') return data;
        if (data && typeof data === 'object') {
            if (typeof data.count === 'number') return data.count;
            if (typeof data.reviews_count === 'number') return data.reviews_count;
            if (typeof data.review_count === 'number') return data.review_count;
            if (typeof data.total_reviews === 'number') return data.total_reviews;
            if (typeof data.total === 'number') return data.total;
            if (typeof data.number_of_reviews === 'number') return data.number_of_reviews;
            if (typeof data.number === 'number') return data.number;
            if (Array.isArray(data)) return data.length;
            if (Array.isArray(data.results)) return data.results.length;
        }
        return 0;
    } catch (err) {
        // logger.warn(`[getUserReviewCount] Error fetching review count for user ${userId}:`, err);
        try {
            const reviews = await getUserReviews(userId);
            return reviews.length;
        } catch {
            return 0;
        }
    }
};

export const getCustomerReviews = getUserReviews;