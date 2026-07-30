# 🌐 `notificationService`

**Source File**: [src/services/notificationService.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/notificationService.ts)

## Overview
`notificationService` manages push notification permissions via `Expo Notifications`, registers push tokens with the backend (`POST /app/user/push-token/`), and dispatches local alert notifications for new task assignments, incoming calls, or bids.

---

## Function Signatures

```typescript
export const registerForPushNotificationsAsync = async (): Promise<string | null>;
export const sendLocalNotification = async (title: string, body: string, data?: any): Promise<void>;
```

---

## Usage Example

```typescript
import { sendLocalNotification } from '@/services/notificationService';

await sendLocalNotification('New Bid Received!', 'Worker Ali placed a bid of Rs. 4,000 on your task.');
```
