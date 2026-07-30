# 📚 KaamKarwao - Architecture Documentation Portal

Welcome to the modular documentation portal for KaamKarwao. This directory contains detailed reference guides for every **Context Provider**, **Custom Hook**, **Zustand Store**, **Core Service**, **Utility Module**, and **Architecture System** in the codebase.

---

## 📂 Documentation Index

### 🧠 Context Providers (`docs/context/`)
- [AuthContext & useAuth](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/context/auth.md) — User authentication, JWT refresh rotation, Firebase OTP, and session persistence.
- [PostJobContext & usePostJob](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/context/post-job.md) — Customer task creation, backend task syncing, live status tracking, bid acceptance, and task cancellation.

---

### 💾 Zustand Global Stores (`docs/stores/`)
- [taskStore](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/stores/taskStore.md) — Active task state, task history, MMKV offline persistence, and multi-user switching.
- [proEarningsStore](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/stores/proEarningsStore.md) — Worker earnings state and TTL-based cache management.
- [proOnlineStore](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/stores/proOnlineStore.md) — Professional online/offline state and MMKV persistence.
- [biddingStore](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/stores/biddingStore.md) — Bid list state, sorting, and bid modal control.

---

### 🌐 Core Services (`docs/services/`)
- [fetchClient](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/fetchClient.md) — Single-flight mutex token refresh, rotated refresh token persistence in Expo `SecureStore`, and Bearer header synchronization.
- [geofenceService](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/geofenceService.md) — Real-world polygon boundary definitions (Bahria Town, DHA, Model Town, Johar Town, etc.) and coordinate validation math.
- [agoraService](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/agoraService.md) — Agora RTC token fetching, voice channel initialization, and audio profile configuration.
- [notificationService](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/notificationService.md) — Expo push notification setup and local alert triggers.
- [task Service](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/task.md) — Task creation chain, multipart attachment uploading, and task CRUD endpoints.
- [user Service](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/services/user.md) — User profile REST endpoints, current user profile fetching, and user reviews.

---

### ⚓ Custom Hooks (`docs/hooks/`)
- [useActiveBids](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useActiveBids.md) — Active task bid filtering and polling manager.
- [useBiddingWebSocket](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useBiddingWebSocket.md) — Real-time WebSocket connection for submitting and receiving task bids.
- [useHomeViewLocation](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useHomeViewLocation.md) — Map geolocation, Leaflet projection offset math, search, reverse geocoding, and polygon geofence validation.
- [useHomeViewTaskPost](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useHomeViewTaskPost.md) — Category bootstrapping, form handling, and task submission logic for Customer Home.
- [useProLiveLocation](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useProLiveLocation.md) — GPS location tracking and backend location synchronization for Professionals.
- [useProWebSocket](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useProWebSocket.md) — Real-time WebSocket live job feed for Professionals.
- [useProfileSubmit](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useProfileSubmit.md) — Onboarding profile creation and user role setup.
- [useRouteByUserType](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useRouteByUserType.md) — Automatic role-based routing hook (Customer, Pro, Admin).
- [useTaskChatWebSocket](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useTaskChatWebSocket.md) — Real-time task chat WebSocket, attachment transmission, and dual-channel VoIP signaling.
- [useAdminDashboard](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/hooks/useAdminDashboard.md) — Admin dashboard metrics, tasks, categories, and city/area query hook via TanStack Query.

---

### 🏗️ Architecture System Guides (`docs/architecture/`)
- [VoIP Voice Calling & WebSocket Architecture](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/architecture/VOIP_AND_WEBSOCKETS.md) — Dual-channel signaling (`[VOICE_CALL_SIGNAL:...]` fallback + JSON events) and Agora RTC voice call state machine.

---

### 🛠️ Utility Modules (`docs/utils/`)
- [attachmentUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/attachmentUtils.md) — Image picker, camera capture, and file URI helper utilities.
- [contactUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/contactUtils.md) — Phone number formatting and WhatsApp deep-linking helpers.
- [distanceUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/distanceUtils.md) — Haversine distance calculation and radius filtering utilities.
- [logger](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/logger.md) — Production-safe environment-aware console logger.
- [taskMapper](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/taskMapper.md) — Backend-to-frontend task object transformation utilities.
