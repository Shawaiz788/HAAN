import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth';
import {
  IdCardType,
  IdSide,
  VerificationRecord,
  IdVerificationPayload,
} from '@/types/idVerification';
import { idVerificationService } from '@/services/idVerificationService';
import VerificationStatusHeader from '@/components/pro/idVerification/VerificationStatusHeader';
import IdCardSlotCard from '@/components/pro/idVerification/IdCardSlotCard';
import IdCameraOverlay from '@/components/pro/idVerification/IdCameraOverlay';

export default function ProIdVerificationView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = Number(user?.id || 1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord] = useState<VerificationRecord>({ status: 'unsubmitted' });

  // Form State
  const cardType: IdCardType = 'cnic';
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  // Camera Overlay Modal State
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [cameraSide, setCameraSide] = useState<IdSide>('front');

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const data = await idVerificationService.getVerificationStatus(userId);
      setRecord(data);
      if (data.frontUri) setFrontUri(data.frontUri);
      if (data.backUri) setBackUri(data.backUri);
    } catch (e) {
      console.warn('[ProIdVerificationView] Error loading verification state:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [userId]);

  const handleOpenCamera = (side: IdSide) => {
    setCameraSide(side);
    setCameraModalVisible(true);
  };

  const handleOpenGallery = async (side: IdSide) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1.58, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        if (side === 'front') setFrontUri(result.assets[0].uri);
        else setBackUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Gallery Error', 'Could not select photo from gallery.');
    }
  };

  const handleConfirmPhoto = (side: IdSide, uri: string) => {
    if (side === 'front') setFrontUri(uri);
    else setBackUri(uri);
  };

  const handleRemovePhoto = (side: IdSide) => {
    if (side === 'front') setFrontUri(null);
    else setBackUri(null);
  };

  const handleSubmit = async () => {
    if (!frontUri) {
      Alert.alert('Missing Front Photo', 'Please capture or select the FRONT side of your CNIC.');
      return;
    }
    if (!backUri) {
      Alert.alert('Missing Back Photo', 'Please capture or select the BACK side of your CNIC.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: IdVerificationPayload = {
        cardType,
        frontUri,
        backUri,
      };

      const updatedRecord = await idVerificationService.submitVerification(userId, payload);
      setRecord(updatedRecord);

      if (Platform.OS === 'android') {
        ToastAndroid.show('CNIC Submitted for Verification', ToastAndroid.SHORT);
      } else {
        Alert.alert('Submitted!', 'Your CNIC photos have been submitted for verification.');
      }
    } catch (e: any) {
      Alert.alert('Submission Error', e?.message || 'Could not submit verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = record.status === 'pending' || record.status === 'verified';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>CNIC Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={styles.loadingText}>Loading verification status...</Text>
          </View>
        ) : (
          <>
            {/* Status Header Banner */}
            <VerificationStatusHeader record={record} />

            {/* Front & Back Document Photo Slots */}
            <Text style={styles.sectionTitle}>CNIC Photo Capture</Text>

            <IdCardSlotCard
              side="front"
              imageUri={frontUri}
              isReadOnly={isReadOnly}
              onOpenCamera={handleOpenCamera}
              onOpenGallery={handleOpenGallery}
              onRemovePhoto={handleRemovePhoto}
            />

            <IdCardSlotCard
              side="back"
              imageUri={backUri}
              isReadOnly={isReadOnly}
              onOpenCamera={handleOpenCamera}
              onOpenGallery={handleOpenGallery}
              onRemovePhoto={handleRemovePhoto}
            />

            {/* Submission Button */}
            {!isReadOnly && (
              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit CNIC for Verification</Text>
                  </>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* Live Camera Viewfinder Overlay Modal */}
      <IdCameraOverlay
        visible={cameraModalVisible}
        side={cameraSide}
        onClose={() => setCameraModalVisible(false)}
        onConfirmPhoto={handleConfirmPhoto}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
