import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { logger } from '@/utils/logger';
import {
  checkChatStatus,
  fetchOlderMessages,
  ChatMessageItem,
} from '@/services/chat';

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
}

export interface UseTaskChatWebSocketResult {
  messages: ChatMessageItem[];
  isOpen: boolean;
  isConnecting: boolean;
  chatError: string | null;
  hasMoreOlderMessages: boolean;
  isLoadingOlder: boolean;
  sendMessage: (body: string, replyToId?: number | string | null) => void;
  loadOlderMessages: () => Promise<void>;
  reconnect: () => void;
}

export function useTaskChatWebSocket({
  taskId,
  userId,
  token,
  enabled = true,
}: UseTaskChatWebSocketOptions): UseTaskChatWebSocketResult {
  const isFocused = useIsFocused();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState<boolean>(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isComponentMounted = useRef<boolean>(true);

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
    if (!taskId || !enabled || !isFocused) return;

    // Reset state
    setChatError(null);
    setIsConnecting(true);

    // Step 2: Check if chat is open (pre-flight check)
    try {
      const statusRes = await checkChatStatus(taskId, token);
      if (!statusRes.is_open) {
        setIsOpen(false);
        setChatError(statusRes.message || 'Chat is not available for this task.');
        setIsConnecting(false);
        return;
      }
      setIsOpen(true);
    } catch (err: any) {
      logger.warn('[useTaskChatWS] Pre-flight check warning:', err?.message);
    }

    // Step 3: Open the WebSocket connection
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
                setMessages(data.messages);
                if (data.messages.length < 20) {
                  setHasMoreOlderMessages(false);
                }
              }
              break;

            case 'message_received':
              if (data.message) {
                setMessages((prev) => appendDeduplicated(prev, data.message));
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
    if (enabled && isFocused && taskId) {
      connect();
    } else {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        logger.log('[useTaskChatWS] Closing chat socket as screen is unfocused or disabled');
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        logger.log('[useTaskChatWS] Closing socket on cleanup');
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        try { socketRef.current.close(1000); } catch (e) {}
        socketRef.current = null;
      }
    };
  }, [connect, enabled, isFocused, taskId]);

  // Step 6: Send a message
  const sendMessage = useCallback(
    (body: string, replyToId: number | string | null = null) => {
      if (!body.trim()) return;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        logger.warn('[useTaskChatWS] Cannot send: WebSocket is not open.');
        return;
      }

      const payload = {
        type: 'send_message',
        body: body.trim(),
        reply_to: replyToId ?? null,
      };

      logger.log('[useTaskChatWS] Sending message payload:', payload);
      socketRef.current.send(JSON.stringify(payload));
    },
    []
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
      }
    } catch (err) {
      logger.warn('[useTaskChatWS] Failed to fetch older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMoreOlderMessages, taskId, messages, token]);

  return {
    messages,
    isOpen,
    isConnecting,
    chatError,
    hasMoreOlderMessages,
    isLoadingOlder,
    sendMessage,
    loadOlderMessages,
    reconnect: connect,
  };
}
