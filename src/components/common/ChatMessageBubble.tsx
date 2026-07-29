import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { ChatMessageItem } from '@/services/chat';
import { styles } from '@/styles/taskChatModal.styles';

export interface ChatMessageBubbleProps {
  msg: ChatMessageItem;
  isUser: boolean;
  bubbleUserBg: string;
  attachmentUrl?: string;
  onPressImage?: (url: string) => void;
}

export function ChatMessageBubble({
  msg,
  isUser,
  bubbleUserBg,
  attachmentUrl,
  onPressImage,
}: ChatMessageBubbleProps) {
  const timeStr = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const hasAttachment = Boolean(
    msg.attachment_id || (msg as any).attachment || (msg as any).attachment_url
  );

  return (
    <View
      style={[
        styles.bubbleContainer,
        isUser ? styles.bubbleContainerUser : styles.bubbleContainerOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? { backgroundColor: bubbleUserBg } : styles.bubbleOther,
        ]}
      >
        {!isUser && msg.sender_name && (
          <Text style={styles.senderLabel}>{msg.sender_name}</Text>
        )}

        {hasAttachment && (
          <View style={styles.attachmentWrapper}>
            {attachmentUrl ? (
              <Pressable onPress={() => onPressImage?.(attachmentUrl)}>
                <Image
                  source={{ uri: attachmentUrl }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <View style={styles.attachmentPlaceholder}>
                <ActivityIndicator size="small" color={isUser ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.attachmentPlaceholderText, { color: isUser ? '#FFFFFF' : '#6B7280' }]}>
                  Loading image...
                </Text>
              </View>
            )}
          </View>
        )}

        {Boolean(msg.body && msg.body.trim().length > 0) && (
          <Text style={isUser ? styles.bubbleUserText : styles.bubbleOtherText}>
            {msg.body}
          </Text>
        )}
      </View>

      {Boolean(timeStr) && (
        <Text style={styles.timeText}>{timeStr}</Text>
      )}
    </View>
  );
}
