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
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
        }
      }
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
        sha1: "5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25",
        sha256: "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
      }
    }
  }
};
