import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  View,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouteByUserType } from '@/hooks/useRouteByUserType';
import { Colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { routeAfterAuth } = useRouteByUserType();
  const [selectedLang, setSelectedLang] = useState<'english' | 'urdu'>('english');

  useEffect(() => {
    if (user) {
      routeAfterAuth(user);
    }
  }, [user, router]);

  const handleContinue = () => {
    if (user) {
      routeAfterAuth(user);
    } else {
      router.push('/onboardings');
    }
  };

  if (user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.dark} />

      <View style={styles.container}>
        {/* Top/Center Branding Area */}
        <View style={styles.brandWrapper}>
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/KaamKrwao.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.brandName}>KaamKarwao</Text>
          <Text style={styles.brandSubtitle}>Find trusted local services</Text>
        </View>

        {/* Bottom Controls Area */}
        <View style={styles.controlsWrapper}>
          <Text style={styles.langLabel}>Choose your language</Text>

          <View style={styles.langRow}>
            <Pressable
              style={[
                styles.langButton,
                selectedLang === 'english' ? styles.langButtonActive : styles.langButtonInactive
              ]}
              onPress={() => setSelectedLang('english')}
            >
              <Text
                style={[
                  styles.langButtonText,
                  selectedLang === 'english' ? styles.langButtonTextActive : styles.langButtonTextInactive
                ]}
              >
                English
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.langButton,
                selectedLang === 'urdu' ? styles.langButtonActive : styles.langButtonInactive
              ]}
              onPress={() => setSelectedLang('urdu')}
            >
              <Text
                style={[
                  styles.langButtonText,
                  selectedLang === 'urdu' ? styles.langButtonTextActive : styles.langButtonTextInactive
                ]}
              >
                اردو
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed
            ]}
            onPress={handleContinue}
          >
            <View style={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} style={styles.arrowIcon} />
            </View>
          </Pressable>

          <View style={styles.trustFooter}>
            <View style={styles.trustColumn}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.brand.dark} />
              <Text style={styles.trustText}>Verified</Text>
            </View>
            <View style={styles.trustColumn}>
              <Ionicons name="people-outline" size={20} color={Colors.brand.dark} />
              <Text style={styles.trustText}>Trusted</Text>
            </View>
            <View style={styles.trustColumn}>
              <Ionicons name="wallet-outline" size={20} color={Colors.brand.dark} />
              <Text style={styles.trustText}>Easy Pay</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brand.dark,
  },
  brandWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 24,
    resizeMode: 'contain',
    overflow: 'hidden'
  },
  brandName: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 18,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  controlsWrapper: {
    width: '100%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  langLabel: {
    color: Colors.neutral[700],
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  langButton: {
    width: '48%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  langButtonActive: {
    backgroundColor: Colors.brand.dark,
    borderColor: Colors.brand.dark,
  },
  langButtonInactive: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[200],
  },
  langButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  langButtonTextActive: {
    color: Colors.white,
  },
  langButtonTextInactive: {
    color: Colors.neutral[700],
  },
  primaryButton: {
    backgroundColor: Colors.brand.amber,
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  arrowIcon: {
    marginTop: 1,
  },
  trustFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  trustColumn: {
    alignItems: 'center',
    flex: 1,
  },
  trustText: {
    color: Colors.neutral[600],
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
