# 🌐 `fetchClient`

**Source File**: [src/services/fetchClient.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/fetchClient.ts)

## Overview
`fetchClient` is the core HTTP networking engine for KaamKarwao. It provides authenticated `fetchWithAuth()` requests, automatic 401 response handling, rotated refresh token persistence in Expo `SecureStore`, and a single-flight mutex (`activeRefreshPromise`) to prevent concurrent refresh stampedes.

---

## Primary Architecture & Features

### 1. **Single-Flight Mutex Pattern (`activeRefreshPromise`)**
When multiple components mount simultaneously on startup and hit 401 Unauthorized or need token validation, `refreshAndPersistToken` creates a single shared `Promise`. Concurrent callers join the in-flight refresh promise instead of spamming parallel POST requests to `/app/token/refresh/`.

### 2. **Refresh Token Rotation & SecureStore Sync**
When Django REST framework returns a rotated `refresh` or `refresh_token`, `fetchClient` updates `user_refresh_token` in Expo `SecureStore` and updates the active `user.refreshToken` in `AuthContext`.

### 3. **Header Synchronization (`getAuthHeaders`)**
Dynamically fetches the latest Bearer token from `SecureStore`, guaranteeing that retry requests after a 401 refresh use the newly minted access token.

---

## Key Functions

```typescript
export const fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export const refreshAccessToken: (refreshToken: string) => Promise<TokenRefreshResult>;
export const getAuthHeaders: () => Promise<Record<string, string>>;
```

---

## Usage Example

```typescript
import { fetchWithAuth } from '@/services/fetchClient';

export const getMyData = async () => {
  const response = await fetchWithAuth(`${API_URL}/app/user/current/`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
};
```
