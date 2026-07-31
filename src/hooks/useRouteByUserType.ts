import { useRouter } from 'expo-router';
import { AppUser } from '@/types';
import { USER_TYPE_ADMIN, USER_TYPE_PRO } from '@/constants/userTypes';

/**
 * Hook that returns a `routeAfterAuth` function.
 * Call it after sign-in, sign-up verification, or profile setup
 * to redirect the user to the correct home screen based on their usertype_id.
 *
 * Routing logic:
 *   - No displayName → profile-setup (new user, incomplete profile)
 *   - usertype_id === USER_TYPE_ADMIN (1) → /(protected)/(admin)/dashboard
 *   - usertype_id === USER_TYPE_PRO (3) → /(protected)/(pro)/live-jobs
 *   - usertype_id === USER_TYPE_CLIENT (2) → /(protected)/(client)/home
 */
export function useRouteByUserType() {
    const router = useRouter();

    const routeAfterAuth = (user: AppUser) => {
        // New user with incomplete profile
        if (!user.displayName) {
            router.replace('/(protected)/profile-setup');
            return;
        }

        // Admin (1)
        if (user.usertype_id === USER_TYPE_ADMIN) {
            router.replace('/(protected)/(admin)/dashboard');
            return;
        }

        // Professional / Worker (3)
        if (user.usertype_id === USER_TYPE_PRO) {
            if (!user.is_verified) {
                router.replace('/(protected)/(pro)/id-verification');
                return;
            }
            router.replace('/(protected)/(pro)/live-jobs');
            return;
        }

        // Client / Customer (2 - default)
        router.replace('/(protected)/(client)/home');
    };

    return { routeAfterAuth };
}
