# 🧠 AuthContext & `useAuth()`

**Source File**: [src/context/auth.tsx](file:///c:/Users/Fahad/Documents/KaamKarwao/src/context/auth.tsx)

## Overview
`AuthContext` provides global authentication state management across the entire application. It manages session persistence via Expo `SecureStore`, Firebase phone authentication, user profile state, JWT access/refresh tokens, and token refresh rotation.

---

## Exported Interface & Context Shape

```typescript
interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  login: (userData: User, accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (fields: Partial<User>) => void;
  confirmPhoneOtp: (otp: string) => Promise<any>;
  sendPhoneOtp: (phoneNumber: string) => Promise<void>;
  authConfirmation: any;
  phoneAuthStep: 'idle' | 'sending' | 'sent' | 'confirming' | 'verified';
  phoneAuthError: string | null;
}
```

---

## Primary Functionalities

1. **Session Bootstrapping & Token Refresh**:
   - On app mount, `AuthContext` reads `user_access_token` and `user_refresh_token` from Expo `SecureStore`.
   - If an access token exists, it attempts to fetch the authenticated user profile (`/app/user/current/`).
   - If the access token is expired, it automatically calls `refreshAndPersistToken` to rotate tokens asynchronously.

2. **Firebase Phone OTP Auth**:
   - `sendPhoneOtp(phoneNumber)`: Triggers Firebase phone authentication OTP code.
   - `confirmPhoneOtp(otp)`: Validates the 6-digit SMS verification code against Firebase.

3. **Login & Session Storage**:
   - `login(userData, accessToken, refreshToken)`: Persists user profile to MMKV cache and JWT tokens to `SecureStore`.

4. **Logout & Cleanup**:
   - `logout()`: Clears `SecureStore` tokens, wipes MMKV user caches, and resets state to `null`.

---

## Usage Example

```tsx
import { useAuth } from '@/context/auth';

export default function ProfileHeader() {
  const { user, logout } = useAuth();

  return (
    <View>
      <Text>Welcome, {user?.displayName || 'User'}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```
