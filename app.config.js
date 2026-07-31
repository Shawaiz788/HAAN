module.exports = {
  expo: {
    name: "KaamKrwao",
    scheme: "kaamkrwao",
    slug: "KaamKrwao",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#325B3B"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.shawaiz788.kaamkrwao",
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#325B3B"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.shawaiz788.kaamkrwao",
      googleServicesFile: "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-font",
      "@react-native-community/datetimepicker"
    ],
    extra: {
      eas: {
        projectId: "d2f27992-5d0f-4456-83c2-640871bd4a86"
      },
      androidDebugFingerprint: {
        sha1: process.env.EXPO_PUBLIC_ANDROID_DEBUG_SHA1 || "",
        sha256: process.env.EXPO_PUBLIC_ANDROID_DEBUG_SHA256 || ""
      }
    }
  }
};
