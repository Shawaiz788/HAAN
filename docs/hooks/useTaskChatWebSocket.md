# ⚓ `useTaskChatWebSocket`

**Source File**: [src/hooks/useTaskChatWebSocket.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useTaskChatWebSocket.ts)

## Overview
`useTaskChatWebSocket` handles real-time task chat messaging, image attachment uploads, message pagination, attachment URL resolution, and dual-channel VoIP call signaling ([VOICE_CALL_SIGNAL:...]) over WebSockets.

---

## Hook Signature

```typescript
export function useTaskChatWebSocket(options: {
  taskId: number | string | null;
  userId?: number | string;
  token?: string | null;
  enabled?: boolean;
  onCallSignalReceived?: (signal: string, payload: any) => void;
}): {
  messages: ChatMessageItem[];
  isConnected: boolean;
  sendMessage: (body: string, replyToId?: number | null, attachmentId?: number | null) => void;
  uploadAndSendAttachment: (uri: string, caption?: string) => Promise<void>;
  sendCallSignal: (signal: 'incoming_call' | 'call_accepted' | 'call_declined' | 'call_ended', extraPayload?: any) => void;
  attachmentCache: Record<string, string>;
  isUploadingAttachment: boolean;
  loadOlderMessages: () => Promise<void>;
  hasMoreOlderMessages: boolean;
  isLoadingOlder: boolean;
}
```

---

## Primary Features

1. **Task Chat WebSocket Connection**: Connects to `wss://<host>/ws/chat/<taskId>/` with token authentication.
2. **Dual-Channel VoIP Call Signaling**: Sends both in-band text fallback (`[VOICE_CALL_SIGNAL:incoming_call:Name]`) and JSON events (`type: 'voice_call_signal'`).
3. **Attachment Resolution & Caching**: Resolves attachment URIs safely via [getAttachmentById](file:///c:/Users/Fahad/Documents/KaamKarwao/src/services/task.ts#L102), caching resolved image URLs in `attachmentCache`.
4. **Scrollback Pagination**: `loadOlderMessages()` fetches older chat history (`/app/chat/{taskId}/messages/?before_sequence={seq}`).

---

## Usage Example

```tsx
import { useTaskChatWebSocket } from '@/hooks/useTaskChatWebSocket';

export default function ChatScreen({ taskId }: { taskId: number }) {
  const {
    messages,
    sendMessage,
    uploadAndSendAttachment,
    sendCallSignal,
  } = useTaskChatWebSocket({ taskId });

  return (
    <View>
      <FlatList data={messages} renderItem={({ item }) => <Text>{item.body}</Text>} />
      <Button title="Send" onPress={() => sendMessage('Hello!')} />
    </View>
  );
}
```
