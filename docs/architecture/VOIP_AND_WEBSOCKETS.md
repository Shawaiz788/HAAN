# 🏗️ VoIP Voice Calling & WebSocket Real-Time Architecture

**Primary Source Files**:
* [src/hooks/useTaskChatWebSocket.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useTaskChatWebSocket.ts)
* [src/components/common/AgoraVoipCallModal.tsx](file:///c:/Users/Fahad/Documents/KaamKarwao/src/components/common/AgoraVoipCallModal.tsx)
* [src/components/common/IncomingCallModal.tsx](file:///c:/Users/Fahad/Documents/KaamKarwao/src/components/common/IncomingCallModal.tsx)
* [src/services/agoraService.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/agoraService.ts)

---

## Architecture Overview

KaamKarwao provides **in-app HD voice calling** between Customers and Professionals using a hybrid dual-channel architecture:
1. **Signaling & Handshake**: Managed over WebSockets (`useTaskChatWebSocket`) via dual-channel signaling events.
2. **Audio Streaming**: Managed by native **Agora RTC Engine** (`react-native-agora`) over encrypted voice channels.

```
┌────────────────────────┐                   ┌────────────────────────┐
│  Caller (Local Client) │                   │ Recipient (Remote Peer)│
└───────────┬────────────┘                   └───────────┬────────────┘
            │                                            │
            │ 1. sendCallSignal('incoming_call')        │
            ├───────────────────────────────────────────►│ (IncomingCallModal pops up)
            │    WebSocket: wss://<host>/ws/chat/<taskId>/│
            │                                            │
            │ 2. Recipient taps "Accept"                 │
            │◄───────────────────────────────────────────┤
            │    sendCallSignal('call_accepted')         │
            │                                            │
            │ 3. Fetch RTC Token & Join Agora Channel   │
            │    getAgoraRtcToken('kaamkarwao_task_101') │
            ├───────────────────────┐                    ├───────────────────────┐
            │  Agora RTC Engine     │                    │  Agora RTC Engine     │
            │  onUserJoined()       │◄══════════════════►│  onUserJoined()       │
            └───────────────────────┘     Encrypted      └───────────────────────┘
                                          Audio Stream
```

---

## 1. Dual-Channel Call Signaling

When a user initiates an in-app voice call:
`useTaskChatWebSocket` dispatches two simultaneous signals over the active task WebSocket:

1. **In-Band Fallback Message**:
   Sends text message `[VOICE_CALL_SIGNAL:incoming_call:CallerName]`. This ensures the call offer is logged in the chat history even if the recipient's WebSocket drops temporarily.
2. **JSON Signaling Event**:
   Sends structured WebSocket payload:
   ```json
   {
     "type": "voice_call_signal",
     "signal": "incoming_call",
     "task_id": 101,
     "sender_id": 42,
     "caller_name": "Ali Hassan",
     "caller_avatar": "https://..."
   }
   ```

---

## 2. Call State Machine & Agora Connection Flow

| State | Status Badge Text | Transition Event | Notes |
| :--- | :--- | :--- | :--- |
| **`calling`** | `Ringing {otherUserName}...` | Local client joins Agora channel (`onJoinChannelSuccess`). | Audio is routed to earpiece by default (`isSpeakerOn = false`). |
| **`connected`** | `Connected • In-App Audio HD` | Remote peer joins Agora channel (`onUserJoined`). | Active voice call timer and controls. |
| **`declined`** | `Call Declined` | Recipient taps "Decline" or sends `call_declined`. | Auto-closes modal after 1.5 seconds. |
| **`ended`** | `Call Ended` | User taps "End Call" or sends `call_ended`. | Leaves Agora RTC channel and releases audio resources. |

---

## 3. Key UI & Theme Specifications

- **Clean White Theme**: `StatusBar` set to `barStyle="dark-content"`, background `#FFFFFF`, high-contrast text `#111827`.
- **Vector Icons**: Standardized using Expo `@expo/vector-icons` (`Ionicons`).
- **Control Layout**: Bottom control card divided into 3 equal-width columns (`controlCol`): Mute, End Call, and Speaker.
- **Default Speaker State**: `isSpeakerOn` defaults to `false` (`engine.setEnableSpeakerphone(false)`), routing audio through the receiver earpiece unless speakerphone is explicitly toggled by the user.
