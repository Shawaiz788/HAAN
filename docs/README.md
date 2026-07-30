# 📚 KaamKarwao - Architecture Documentation Portal

Welcome to the modular documentation portal for KaamKarwao. This directory contains detailed reference guides for every **Context Provider**, **Custom Hook**, and **Utility Module** in the codebase.

---

## 📂 Documentation Index

### 🧠 Context Providers (`docs/context/`)
- [AuthContext & useAuth](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/context/auth.md) — User authentication, JWT refresh rotation, Firebase OTP, and session persistence.
- [PostJobContext & usePostJob](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/context/post-job.md) — Customer task creation, backend task syncing, live status tracking, bid acceptance, and task cancellation.

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

### 🛠️ Utility Modules (`docs/utils/`)
- [attachmentUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/attachmentUtils.md) — Image picker, camera capture, and file URI helper utilities.
- [contactUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/contactUtils.md) — Phone number formatting and WhatsApp deep-linking helpers.
- [distanceUtils](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/distanceUtils.md) — Haversine distance calculation and radius filtering utilities.
- [logger](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/logger.md) — Production-safe environment-aware console logger.
- [taskMapper](file:///c:/Users/Fahad/Documents/KaamKarwao/docs/utils/taskMapper.md) — Backend-to-frontend task object transformation utilities.
