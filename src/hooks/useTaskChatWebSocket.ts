import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { logger } from '@/utils/logger';
import {
  checkChatStatus,
  fetchOlderMessages,
  ChatMessageItem,
} from '@/services/chat';
import { uploadAttachment, getAttachmentById } from '@/services/task';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const WS_BASE = BASE_URL
  .replace(/\/$/, '')
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws');

export interface UseTaskChatWebSocketOptions {
  taskId: number | string | undefined | null;
  userId: number | string | undefined | null;
  token?: string;
  enabled?: boolean;
  onIncomingCallSignal?: (callData: { taskId: number | string; callerName: string; callerAvatar?: string; signal: string }) => void;
}

export interface UseTaskChatWebSocketResult {
  messages: ChatMessageItem[];
  isOpen: boolean;
  isConnecting: boolean;
  chatError: string | null;
  hasMoreOlderMessages: boolean;
  isLoadingOlder: boolean;
  attachmentCache: Record<string | number, string>;
  isUploadingAttachment: boolean;
  sendMessage: (body: string, replyToId?: number | string | null, attachmentId?: number | null) => void;
  sendCallSignal: (signal: 'incoming_call' | 'call_accepted' | 'call_declined' | 'call_ended', payload?: any) => void;
  uploadAndSendAttachment: (uri: string, caption?: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  reconnect: () => void;
}

export function useTaskChatWebSocket({
  taskId,
  userId,
  token,
  enabled = true,
  onIncomingCallSignal,
}: UseTaskChatWebSocketOptions): UseTaskChatWebSocketResult {
  const isFocused = useIsFocused();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState<boolean>(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [attachmentCache, setAttachmentCache] = useState<Record<string | number, string>>({});
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const onIncomingCallSignalRef = useRef(onIncomingCallSignal);
  useEffect(() => {
    onIncomingCallSignalRef.current = onIncomingCallSignal;
  }, [onIncomingCallSignal]);

  // Auto-scan messages for missing attachment URLs and resolve them
  useEffect(() => {
    messages.forEach((m: any) => {
      const attId = m.attachment_id ?? m.attachment;
      if (m.attachment_url && typeof m.attachment_url === 'string') {
        const key = attId != null ? String(attId) : String(m.id);
        setAttachmentCache((prev) => (prev[key] === m.attachment_url ? prev : { ...prev, [key]: m.attachment_url }));
        return;
      }
      if (m.attachment && typeof m.attachment === 'object' && (m.attachment.url || m.attachment.file)) {
        const url = m.attachment.url || m.attachment.file;
        const key = attId != null ? String(attId) : String(m.id);
        setAttachmentCache((prev) => (prev[key] === url ? prev : { ...prev, [key]: url }));
        return;
      }
      if (attId != null && typeof attId !== 'object') {
        const keyStr = String(attId);
        if (!attachmentCache[keyStr]) {
          logger.log('[useTaskChatWS] Triggering attachment resolution for ID:', attId);
          getAttachmentById(attId, taskId ? Number(taskId) : undefined)
            .then((att) => {
              if (att.url) {
                logger.log('[useTaskChatWS] Successfully resolved attachment URL for ID:', attId, att.url);
                setAttachmentCache((prev) => ({ ...prev, [keyStr]: att.url, [Number(attId)]: att.url }));
              }
            })
            .catch((e) => logger.warn('[useTaskChatWS] Failed to resolve attachment:', attId, e));
        }
      }
    });
  }, [messages, attachmentCache, taskId]);

  // Transmits dual-channel VoIP signals: sends in-band text fallback ([VOICE_CALL_SIGNAL:...]) + JSON event (voice_call_signal)
  const sendCallSignal = useCallback((signal: 'incoming_call' | 'call_accepted' | 'call_declined' | 'call_ended', extraPayload?: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    try {
      const callerName = extraPayload?.caller_name || 'User';
      socketRef.current.send(JSON.stringify({
        type: 'send_message',
        body: `[VOICE_CALL_SIGNAL:${signal}:${callerName}]`,
        reply_to: null,
      }));
      socketRef.current.send(JSON.stringify({
        type: 'voice_call_signal',
        signal,
        task_id: taskId,
        sender_id: userId,
        ...extraPayload,
      }));
    } catch (e) {
      logger.warn('[useTaskChatWS] Failed to send call signal:', e);
    }
  }, [taskId, userId]);
  const isComponentMounted = useRef<boolean>(true);
  const hasCheckedStatusRef = useRef<boolean>(false);

  // Reset status check flag when taskId or enabled state changes
  useEffect(() => {
    hasCheckedStatusRef.current = false;
  }, [taskId, enabled]);

  // Helper to deduplicate messages by ID or sequence
  const appendDeduplicated = (existing: ChatMessageItem[], incoming: ChatMessageItem[] | ChatMessageItem) => {
    const listToAppend = Array.isArray(incoming) ? incoming : [incoming];
    const seenIds = new Set(existing.map((m) => String(m.id || m.sequence)));
    const filteredNew = listToAppend.filter((m) => !seenIds.has(String(m.id || m.sequence)));
    return [...existing, ...filteredNew];
  };

  const prependDeduplicated = (existing: ChatMessageItem[], older: ChatMessageItem[]) => {
    const seenIds = new Set(existing.map((m) => String(m.id || m.sequence)));
    const filteredOlder = older.filter((m) => !seenIds.has(String(m.id || m.sequence)));
    return [...filteredOlder, ...existing];
  };

  const connect = useCallback(async () => {
    if (!taskId || !enabled) return;

    // Reset state
    setChatError(null);
    setIsConnecting(true);

    // Step 2: Check if chat is open (pre-flight check) - ONLY ONCE per taskId session
    if (!hasCheckedStatusRef.current) {
      try {
        const statusRes = await checkChatStatus(taskId, token);
        hasCheckedStatusRef.current = true;
        if (!statusRes.is_open) {
          setIsOpen(false);
          setChatError(statusRes.message || 'Chat is not available for this task.');
          setIsConnecting(false);
          return;
        }
        setIsOpen(true);
      } catch (err: any) {
        logger.warn('[useTaskChatWS] Pre-flight check warning:', err?.message);
        hasCheckedStatusRef.current = true;
      }
    }

    // Step 3: Open the WebSocket connection directly
    try {
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      const wsUrl = `${WS_BASE}/ws/chat/${taskId}/${tokenParam}`;
      logger.log('[useTaskChatWS] Connecting to:', wsUrl);

      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        try { socketRef.current.close(1000); } catch (e) {}
        socketRef.current = null;
      }

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        logger.log('[useTaskChatWS] WebSocket connected successfully');
        setIsConnecting(false);
        setChatError(null);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;
        try {
          const data = JSON.parse(event.data);
          logger.log('[useTaskChatWS] Message received:', data.type);

          switch (data.type) {
            case 'message_history':
              if (Array.isArray(data.messages)) {
                const filteredHistory = data.messages.filter((m: any) => !m.body?.startsWith('[VOICE_CALL_SIGNAL:'));
                setMessages(filteredHistory);
                if (filteredHistory.length < 20) {
                  setHasMoreOlderMessages(false);
                }
              }
              break;

            case 'message_received':
              if (data.message) {
                const bodyStr = data.message.body || '';
                if (bodyStr.startsWith('[VOICE_CALL_SIGNAL:')) {
                  const content = bodyStr.substring(19, bodyStr.length - 1);
                  const parts = content.split(':');
                  const sig = parts[0] || 'incoming_call';
                  const caller = parts[1] || 'Caller';
                  const senderId = data.message.sender_id || data.message.sender;
                  if (senderId && String(senderId) !== String(userId)) {
                    onIncomingCallSignalRef.current?.({
                      taskId: taskId,
                      callerName: caller,
                      callerAvatar: '',
                      signal: sig,
                    });
                  }
                } else {
                  setMessages((prev) => appendDeduplicated(prev, data.message));
                }
              }
              break;

            case 'voice_call_signal':
              if (data.sender_id && String(data.sender_id) !== String(userId)) {
                onIncomingCallSignalRef.current?.({
                  taskId: data.task_id || taskId,
                  callerName: data.caller_name || 'Caller',
                  callerAvatar: data.caller_avatar || '',
                  signal: data.signal,
                });
              }
              break;

            case 'error':
              setChatError(data.detail || 'An error occurred in chat.');
              break;
          }
        } catch (e) {
          logger.error('[useTaskChatWS] JSON parse error on message:', e);
        }
      };

      // Step 4: Handle connection close codes
      ws.onclose = (event) => {
        if (!isComponentMounted.current) return;
        logger.log(`[useTaskChatWS] Socket closed code=${event.code}, reason=${event.reason}`);
        setIsConnecting(false);

        switch (event.code) {
          case 4001:
            setChatError("You're not authorized to view this chat.");
            setIsOpen(false);
            break;
          case 4003:
            setChatError("Chat isn't open for this task right now.");
            setIsOpen(false);
            break;
          case 4004:
            setChatError('Task not found.');
            setIsOpen(false);
            break;
          default:
            // Normal close or network drop
            break;
        }
      };

      ws.onerror = (error) => {
        logger.warn('[useTaskChatWS] WebSocket error event:', error);
      };
    } catch (err: any) {
      logger.error('[useTaskChatWS] Exception creating WebSocket:', err);
      setIsConnecting(false);
      setChatError('Failed to establish chat connection.');
    }
  }, [taskId, token, enabled, isFocused]);

  useEffect(() => {
    isComponentMounted.current = true;
    if (enabled && taskId) {
      connect();
    } else {
      if (socketRef.current) {
        logger.log('[useTaskChatWS] Closing chat socket as screen is disabled');
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        try { socketRef.current.close(1000); } catch (e) {}
        socketRef.current = null;
      }
      setIsConnecting(false);
    }

    return () => {
      isComponentMounted.current = false;
      if (socketRef.current) {
        logger.log('[useTaskChatWS] Closing socket on cleanup');
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        try { socketRef.current.close(1000); } catch (e) {}
        socketRef.current = null;
      }
    };
  }, [connect, enabled, taskId]);

  // Step 6: Send a message
  const sendMessage = useCallback(
    (body: string, replyToId: number | string | null = null, attachmentId: number | null = null) => {
      const trimmedBody = body.trim();
      if (!trimmedBody && !attachmentId) return;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        logger.warn('[useTaskChatWS] Cannot send: WebSocket is not open.');
        return;
      }

      const payload: any = {
        type: 'send_message',
        body: trimmedBody,
        reply_to: replyToId ?? null,
      };

      if (attachmentId) {
        payload.attachment_id = attachmentId;
      }

      logger.log('[useTaskChatWS] Sending message payload:', payload);
      socketRef.current.send(JSON.stringify(payload));
    },
    []
  );

  // Helper to upload file first then send message with attachment_id
  const uploadAndSendAttachment = useCallback(
    async (uri: string, caption: string = '') => {
      if (!taskId) return;
      setIsUploadingAttachment(true);
      try {
        const numericTaskId = Number(taskId);
        const result = await uploadAttachment(uri, numericTaskId);
        logger.log('[useTaskChatWS] Uploaded attachment:', result);
        if (result.url) {
          setAttachmentCache((prev) => ({
            ...prev,
            [String(result.id)]: result.url,
            [Number(result.id)]: result.url,
          }));
        }
        sendMessage(caption, null, result.id);
      } catch (err: any) {
        logger.error('[useTaskChatWS] Attachment upload error:', err?.message || err);
        throw err;
      } finally {
        setIsUploadingAttachment(false);
      }
    },
    [taskId, sendMessage]
  );

  // Step 7: Load older messages (scroll-back pagination)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlderMessages || !taskId || messages.length === 0) return;

    setIsLoadingOlder(true);
    try {
      const oldestLoadedSequence = messages[0]?.sequence;
      if (oldestLoadedSequence == null) {
        setHasMoreOlderMessages(false);
        setIsLoadingOlder(false);
        return;
      }

      const res = await fetchOlderMessages(taskId, oldestLoadedSequence, token);
      if (!res.results || res.results.length === 0 || res.next === null) {
        setHasMoreOlderMessages(false);
      }

      if (res.results && res.results.length > 0) {
        const olderChronological = [...res.results].reverse();
        setMessages((prev) => prependDeduplicated(prev, olderChronological));

        // Resolve attachments for older messages
        olderChronological.forEach((m: any) => {
          if (m.attachment_id && typeof m.attachment_id === 'number') {
            getAttachmentById(m.attachment_id)
              .then((att) => {
                if (att.url) {
                  setAttachmentCache((prev) => ({ ...prev, [m.attachment_id]: att.url }));
                }
              })
              .catch(() => {});
          }
        });
      }
    } catch (err) {
      logger.warn('[useTaskChatWS] Failed to fetch older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMoreOlderMessages, taskId, messages, token]);

  const forceReconnect = useCallback(() => {
    hasCheckedStatusRef.current = false;
    connect();
  }, [connect]);

  return {
    messages,
    isOpen,
    isConnecting,
    chatError,
    hasMoreOlderMessages,
    isLoadingOlder,
    attachmentCache,
    isUploadingAttachment,
    sendMessage,
    sendCallSignal,
    uploadAndSendAttachment,
    loadOlderMessages,
    reconnect: forceReconnect,
  };
}
