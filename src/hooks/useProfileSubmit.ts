import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/auth';
import { createUser, verifyUserOnBackend, loginUser, LoginResponse } from '@/services/user';
import { useMutation } from '@tanstack/react-query';
import { getOrCreateLocationChain } from '@/services/location';
import { USER_TYPE_ADMIN, USER_TYPE_CLIENT, USER_TYPE_PRO } from '@/constants/userTypes';
import { createProEarnings } from '@/services/proEarnings';
import { useRouteByUserType } from '@/hooks/useRouteByUserType';
import { AppUser } from '@/types';
import { logger } from '@/utils/logger';

type Role = 'client' | 'provider' | 'admin';

interface UseProfileSubmitParams {
  user?: AppUser | null;
  params: { password?: string; [key: string]: any };
  countryName: string | undefined;
  fullName: string;
  email: string;
  role: Role;
  gender: string;
  selectedCity: string;
  selectedCityId: number | undefined;
  area: string;
  selectedAreaId: number | undefined;
  houseNumber: string;
  streetNumber: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  setIsLoading: (v: boolean) => void;
  setErrorMsg: (v: string | null) => void;
}

export function useProfileSubmit({
  user,
  params,
  countryName,
  fullName,
  email,
  role,
  gender,
  selectedCity,
  selectedCityId,
  area,
  selectedAreaId,
  houseNumber,
  streetNumber,
  zipCode,
  latitude,
  longitude,
  formattedAddress,
  setIsLoading,
  setErrorMsg,
}: UseProfileSubmitParams) {
  const { login } = useAuth();
  const { routeAfterAuth } = useRouteByUserType();
  const addMutation = useMutation({ mutationFn: createUser });

  const createUserRecord = async () => {
    if (!user) return null;

    const nameParts = fullName.trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    const usertype_id =
      role === 'admin'
        ? USER_TYPE_ADMIN
        : role === 'provider'
        ? USER_TYPE_PRO
        : USER_TYPE_CLIENT;

    if (!selectedCity) throw new Error('Please select a city.');
    if (!area) throw new Error('Please select your Area / Sector.');
    if (!houseNumber.trim()) throw new Error('House number is required.');
    if (!/^\d+$/.test(houseNumber.trim())) throw new Error('House number must contain only numbers.');
    if (!streetNumber.trim()) throw new Error('Street number is required.');
    if (!zipCode.trim()) throw new Error('Zip code is required.');
    if (!/^\d+$/.test(zipCode.trim())) throw new Error('Zip code must contain only numbers.');
    if (latitude === null || longitude === null) throw new Error('Pin location / GPS coordinates are required.');
    if (!formattedAddress.trim()) throw new Error('Formatted address is required.');

    logger.log('[profile-setup] Resolving location chain...');
    const resolvedLoc = await getOrCreateLocationChain({
      countryName: countryName || 'Pakistan',
      cityName: selectedCity,
      areaName: area,
      resolvedCityId: selectedCityId,
      resolvedAreaId: selectedAreaId,
      houseNumber: houseNumber.trim(),
      streetNumber: streetNumber.trim(),
      latitude,
      longitude,
      zipCode: zipCode.trim(),
      formatted_address: formattedAddress.trim(),
    });

    const locationId = resolvedLoc.id;
    if (!locationId) throw new Error('Failed to resolve or create your location profile.');
    logger.log('[profile-setup] Resolved Location ID:', locationId);

    const savedPassword = await SecureStore.getItemAsync('pending_signup_password');
    logger.log('[SecureStore] Loaded pending signup password string length:', savedPassword ? savedPassword.length : 0);
    const passwordToUse = savedPassword || (params.password as string);

    // Let the backend set overall_rating — client should not dictate initial rating
    return await addMutation.mutateAsync({
      first_name,
      last_name,
      phone_number: user.phoneNumber || '',
      email: email.trim(),
      gender,
      usertype_id,
      location_id: locationId,
      password: passwordToUse,
    });
  };

  const handleGoToHome = async () => {
    if (!user) return;

    // Validation
    if (!fullName.trim()) { setErrorMsg('Full name is required'); return; }
    if (!email.trim()) { setErrorMsg('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address (e.g., you@example.com)'); return;
    }
    if (!selectedCity) { setErrorMsg('Please select a city.'); return; }
    if (!area) { setErrorMsg('Please select your Area / Sector.'); return; }
    if (!houseNumber.trim()) { setErrorMsg('House number is required.'); return; }
    if (!/^\d+$/.test(houseNumber.trim())) { setErrorMsg('House number must contain only numbers.'); return; }
    if (!streetNumber.trim()) { setErrorMsg('Street number is required.'); return; }
    if (!zipCode.trim()) { setErrorMsg('Zip code is required.'); return; }
    if (!/^\d+$/.test(zipCode.trim())) { setErrorMsg('Zip code must contain only numbers.'); return; }
    if (latitude === null || longitude === null) { setErrorMsg('Pin location / GPS coordinates are required.'); return; }
    if (!formattedAddress.trim()) { setErrorMsg('Formatted address is required.'); return; }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      logger.log('[profile-setup] Starting CreateUser chain...');
      const createdUser = await createUserRecord();

      const savedPassword = await SecureStore.getItemAsync('pending_signup_password');
      const passwordToUse = savedPassword || (params.password as string);

      await SecureStore.deleteItemAsync('pending_signup_password');
      logger.log('[SecureStore] Deleted pending signup password');

      if (createdUser && user) {
        let token = createdUser.access || createdUser.access_token || createdUser.token;
        let refreshToken = createdUser.refresh || createdUser.refresh_token;

        if (!token && createdUser.phone_number && passwordToUse) {
          try {
            logger.log('[profile-setup] Registration did not return a JWT token. Programmatically logging in...');
            const loginInfo: LoginResponse = await loginUser(createdUser.phone_number, passwordToUse);
            token = loginInfo.access || loginInfo.access_token || loginInfo.token;
            refreshToken = loginInfo.refresh || loginInfo.refresh_token;
            logger.log('[profile-setup] Programmatic login complete. Token obtained.');
          } catch (loginErr) {
            logger.error('[profile-setup] Programmatic login failed:', loginErr);
          }
        }

        if (createdUser.id) {
          try {
            logger.log(`[profile-setup] Auto-verifying new account on backend for User ID: ${createdUser.id}...`);
            await verifyUserOnBackend(createdUser.id);
            logger.log('[profile-setup] Backend verification complete!');
          } catch (verifyErr) {
            logger.error('[profile-setup] Auto-verification on backend failed:', verifyErr);
          }
        }

        if (createdUser.id && createdUser.usertype_id === USER_TYPE_PRO) {
          try {
            logger.log(`[profile-setup] Initializing WorkerEarnings for Pro User ID: ${createdUser.id}...`);
            await createProEarnings(createdUser.id);
            logger.log('[profile-setup] WorkerEarnings initialized successfully!');
          } catch (earningsErr) {
            logger.warn('[profile-setup] WorkerEarnings initialization warning:', earningsErr);
          }
        }

        const appUser = {
          uid: createdUser.id?.toString() || user.uid,
          displayName: `${createdUser.first_name} ${createdUser.last_name}`.trim(),
          email: createdUser.email,
          phoneNumber: createdUser.phone_number,
          id: createdUser.id,
          first_name: createdUser.first_name,
          last_name: createdUser.last_name,
          gender: createdUser.gender,
          usertype_id: createdUser.usertype_id,
          location_id: createdUser.location_id,
          overall_rating: createdUser.overall_rating ?? user?.overall_rating,
          token,
          refreshToken,
        };
        await login(appUser, passwordToUse);

        logger.log('Profile setup saved successfully!');
        routeAfterAuth(appUser);
        return;
      }
    } catch (err: any) {
      logger.error('[profile-setup] Profile setup failed:', err);
      let friendlyMsg = 'Failed to save profile. Please try again.';
      const rawMsg = err?.message || '';

      if (
        rawMsg.includes('timed out') ||
        rawMsg.includes('not responding') ||
        rawMsg.includes('connection error') ||
        rawMsg.includes('could not be reached')
      ) {
        friendlyMsg = rawMsg;
      } else if (
        rawMsg.includes('Status: 5') ||
        rawMsg.includes('500') ||
        rawMsg.includes('504') ||
        rawMsg.includes('502') ||
        rawMsg.includes('5xx') ||
        rawMsg.includes('temporarily busy')
      ) {
        friendlyMsg = 'The server is temporarily busy. Please try again in a few moments.';
      } else if (
        rawMsg.includes('Failed to create user') ||
        rawMsg.includes('Status:') ||
        rawMsg.includes('Response:')
      ) {
        friendlyMsg = 'Registration failed. The email or phone number might already be in use.';
      } else if (rawMsg.includes('Failed to resolve or create your location profile')) {
        friendlyMsg = 'Location verification failed. Please check your address details.';
      } else if (rawMsg) {
        friendlyMsg = rawMsg;
      }

      setErrorMsg(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleGoToHome };
}
