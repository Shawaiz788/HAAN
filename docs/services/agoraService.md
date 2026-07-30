# 🌐 `agoraService`

**Source File**: [src/services/agoraService.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/agoraService.ts)

## Overview
`agoraService` handles Agora RTC (Real-Time Communication) token generation, channel name formatting, and RTC engine audio profile configuration for in-app VoIP voice calls between customers and professionals.

---

## Primary Functions

```typescript
export const getAgoraRtcToken = async (
  channelName: string,
  uid: number
): Promise<{ token: string; appId: string }>;
```

---

## Key Responsibilities

1. **Token Fetching**: Queries backend `/app/agora/token/` to obtain dynamic, time-limited Agora RTC tokens for voice calling.
2. **Channel Formatting**: Constructs standardized channel names (`kaamkarwao_task_<taskId>`) so both caller and recipient join the exact same voice room.

---

## Usage Example

```typescript
import { getAgoraRtcToken } from '@/services/agoraService';

const tokenData = await getAgoraRtcToken('kaamkarwao_task_101', 42);
console.log('Agora App ID:', tokenData.appId);
console.log('Agora Token:', tokenData.token);
```
