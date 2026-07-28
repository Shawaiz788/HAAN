import React, { useRef, useEffect, useState } from 'react';
import {
  Text,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth, PhoneAuthProvider, signInWithCredential, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { USER_TYPE_CLIENT } from '@/constants/userTypes';
import { Colors } from '@/constants/colors';
import { logger } from '@/utils/logger';
import { styles } from '@/styles/verify.styles';

const verifySchema = z.object({
  code: z.string({ message: 'Code is required' }).length(6, 'Verification code must be 6 digits'),
});

type VerifyFields = z.infer<typeof verifySchema>;

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<VerifyFields>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: '',
    },
  });

  const router = useRouter();
  const { login } = useAuth();

  const params = useLocalSearchParams<{
    phoneNumber?: string;
    verificationId?: string;
    password?: string;
    flowType?: string;
  }>();

  const phoneNumber = params.phoneNumber || '';
  const verificationId = params.verificationId || '';

  const [activeVerificationId, setActiveVerificationId] = useState(verificationId);

  useEffect(() => {
    if (verificationId) {
      setActiveVerificationId(verificationId);
    }
  }, [verificationId]);

  const inputRef = useRef<TextInput>(null);
  const codeValue = watch('code');

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    // Autofocus input on screen load
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const onVerify = async ({ code }: VerifyFields) => {
    setIsLoading(true);
    try {
      setFeedbackType(null);
      setFeedbackMessage(null);

      if (!activeVerificationId) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      const authInstance = getAuth();
      const credential = PhoneAuthProvider.credential(activeVerificationId, code);
      const userCredential = await signInWithCredential(authInstance, credential);

      setFeedbackType('success');
      setFeedbackMessage('Verification successful!');
      setIsVerified(true);

      // Establish custom session
      const appUser = {
        uid: userCredential.user.uid,
        displayName: userCredential.user.displayName || '',
        email: userCredential.user.email || '',
        phoneNumber: userCredential.user.phoneNumber || phoneNumber,
        first_name: '',
        last_name: '',
        gender: '',
        usertype_id: USER_TYPE_CLIENT,
      };
      await login(appUser);

      router.replace({
        pathname: '/profile-setup',
        params: {
          phoneNumber: params.phoneNumber || '',
          verificationId: params.verificationId || '',
          password: params.password || '',
          flowType: params.flowType || '',
        },
      });
    } catch (err: any) {
      logger.log('Verification error: ', err);
      setError('root', { message: err.message || 'Verification failed. Please try again.' });
      setIsLoading(false);
      setIsVerified(false);
    }
  };

  const onResendCode = async () => {
    try {
      setFeedbackType(null);
      setFeedbackMessage(null);

      if (!phoneNumber) {
        throw new Error('Phone number is missing.');
      }

      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(authInstance, phoneNumber);
      if (!confirmation.verificationId) {
        throw new Error('Failed to get verification ID from server.');
      }
      setActiveVerificationId(confirmation.verificationId);

      setFeedbackType('success');
      setFeedbackMessage('Verification code resent successfully!');
      setTimeout(() => {
        setFeedbackMessage(null);
        setFeedbackType(null);
      }, 4000);
    } catch (err: any) {
      logger.log('Resend error: ', err);
      setFeedbackType('error');
      setFeedbackMessage(err.message || 'Failed to resend verification code');
      setTimeout(() => {
        setFeedbackMessage(null);
        setFeedbackType(null);
      }, 4000);
    }
  };

  if (isVerified) {
    return (
      <View style={verifyLocalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5A3E" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Area */}
          <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
            <View style={[styles.circleDeco, styles.circle1]} />
            <View style={[styles.circleDeco, styles.circle2]} />

            {/* Back Button */}
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/sign-in');
                }
              }}
            >
              <Ionicons name="arrow-back-outline" size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            {/* Language Selector in Header background */}
            <Pressable style={styles.langSelector}>
              <Ionicons name="globe-outline" size={14} color="#FFFFFF" />
              <Text style={styles.langSelectorText}>اردو</Text>
            </Pressable>

            {/* Phone Icon Box */}
            <View style={styles.envelopeIconBox}>
              <Ionicons name="phone-portrait-outline" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Verify your phone</Text>
              <Text style={styles.headerSubtitle}>
                We sent a 6-digit code to{' '}
                <Text style={styles.emailBold}>{phoneNumber}</Text>
              </Text>
            </View>
          </View>

          {/* Form Content Area */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Enter verification code</Text>

            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={styles.otpSection}>
                  {/* Styled Box Grid (rendered underneath) */}
                  <View style={styles.codeContainer}>
                    {Array(6).fill(0).map((_, index) => {
                      const char = value ? value[index] : '';
                      const isFocusedBox = index === (value ? value.length : 0);
                      return (
                        <View
                          key={index}
                          style={[
                            styles.codeBox,
                            isFocusedBox && styles.codeBoxFocused,
                            error && styles.codeBoxError,
                          ]}
                        >
                          <Text style={styles.codeText}>{char}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Invisible native input (overlayed on top to capture tap gestures) */}
                  <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, '').slice(0, 6);
                      onChange(numeric);
                    }}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.hiddenInput}
                    autoComplete="one-time-code"
                  />

                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </View>
              )}
            />

            {/* Empty space*/}
            <View style={styles.spacer} />

            {errors.root && (
              <Text style={styles.rootErrorText}>{errors.root.message}</Text>
            )}

            {/* Verify & Continue Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (codeValue?.length !== 6 || isLoading) && styles.primaryButtonDisabled,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={handleSubmit(onVerify)}
              disabled={codeValue?.length !== 6 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              )}
            </Pressable>

            {/* Resend Code Button */}
            <Pressable
              style={({ pressed }) => [
                styles.resendButton,
                pressed && styles.resendButtonPressed,
              ]}
              onPress={onResendCode}
            >
              <Ionicons name="refresh-sharp" size={16} color="#1F2937" />
              <Text style={styles.resendButtonText}>Resend code</Text>
            </Pressable>

            {feedbackMessage && (
              <Text
                style={[
                  styles.feedbackText,
                  feedbackType === 'success' ? styles.successText : styles.errorColorText,
                ]}
              >
                {feedbackMessage}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const verifyLocalStyles = RNStyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brand.dark,
  },
});