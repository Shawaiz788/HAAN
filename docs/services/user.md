# 🌐 `user` Service

**Source File**: [src/services/user.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/user.ts)

## Overview
`user.ts` provides user profile REST API endpoints, current authenticated user profile fetching (`/app/user/current/`), user location updates (`PUT /app/user/location/`), user review fetching (`getUserReviews`), and profile image uploads.

---

## Function Signatures

```typescript
export const getCurrentUser = async (): Promise<User | null>;
export const updateUserProfile = async (userId: number, fields: Partial<User>): Promise<User>;
export const uploadProfilePic = async (userId: number, uri: string): Promise<string>;
export const getUserReviews = async (userId: number, forceRefresh?: boolean): Promise<UserReview[]>;
```

---

## Usage Example

```typescript
import { getCurrentUser } from '@/services/user';

const currentUser = await getCurrentUser();
console.log('Logged in user:', currentUser?.displayName);
```
