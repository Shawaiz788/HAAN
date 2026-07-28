import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginUser, LoginResponse } from '@/services/user';
import { API_URL } from '@/services/fetchClient';
import { useAuth } from '@/context/auth';
import { useRouteByUserType } from '@/hooks/useRouteByUserType';
import { logger } from '@/utils/logger';
import AuthHeader from '@/components/auth/AuthHeader';
import PhoneInputField from '@/components/auth/PhoneInputField';
import PasswordInputField from '@/components/auth/PasswordInputField';

const signInSchema = z.object({
  phone: z
    .string({ message: 'Phone number is required' })
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits (e.g. 3001234567)'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-zA-Z]/, 'Password must contain at least one alphabet letter')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

type SignInFields = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { routeAfterAuth } = useRouteByUserType();
  const [loadingStep, setLoadingStep] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInFields>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSignIn = async (data: SignInFields) => {
    try {
      setLoadingStep('Authenticating credentials...');
      const formattedPhone = `+92${data.phone}`;
      const userInfo: LoginResponse = await loginUser(formattedPhone, data.password);

      setLoadingStep('Fetching user profile...');
      const token = userInfo.access || userInfo.access_token || userInfo.token;
      const refreshToken = userInfo.refresh || userInfo.refresh_token;
      const userDetails = userInfo.user || userInfo;

      if (!userDetails || !userDetails.id) {
        throw new Error('Login failed. Invalid user data received from server.');
      }

      const rawPic = userDetails.profile_pic || userDetails.image;
      const profilePicUrl = rawPic ? (rawPic.startsWith('http') ? rawPic : `${API_URL}${rawPic}`) : undefined;

      const appUser = {
        uid: userDetails.id.toString(),
        displayName: `${userDetails.first_name} ${userDetails.last_name}`.trim(),
        email: userDetails.email,
        phoneNumber: userDetails.phone_number,
        id: userDetails.id,
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        gender: userDetails.gender,
        usertype_id: userDetails.usertype_id,
        location_id: userDetails.location_id,
        overall_rating: userDetails.overall_rating,
        profile_pic: profilePicUrl,
        token,
        refreshToken,
      };

      setLoadingStep('Syncing session...');
      await login(appUser, data.password);

      setLoadingStep('Redirecting...');
      routeAfterAuth(appUser);
    } catch (err: any) {
      logger.log('Sign in error: ', err);
      setError('root', { message: err.message || 'An error occurred signing in' });
    } finally {
      setLoadingStep(null);
    }
  };

  const isLoading = Boolean(loadingStep);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5A3E" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader
            topInset={insets.top}
            title="Sign In"
            subtitle="Enter your phone and password to sign in"
          />

          <View style={styles.formContainer}>
            <View style={styles.form}>
              <PhoneInputField control={control} name="phone" autoFocus />
              <PasswordInputField control={control} name="password" />

              {errors.root && <Text style={styles.rootErrorText}>{errors.root.message}</Text>}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isLoading) && styles.primaryButtonPressed,
                  isLoading && styles.primaryButtonDisabled,
                ]}
                onPress={handleSubmit(onSignIn)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.loadingStepText}>{loadingStep}</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.redirectContainer}>
                <Text style={styles.redirectText}>Don't have an account? </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Pressable>
                    <Text style={styles.redirectLinkText}>Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  form: {
    gap: 20,
  },
  rootErrorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#D97706',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    backgroundColor: '#FCD34D',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingStepText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  redirectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  redirectText: {
    color: '#6B7280',
    fontSize: 14,
  },
  redirectLinkText: {
    color: '#0B5A3E',
    fontWeight: '700',
    fontSize: 14,
  },
});
