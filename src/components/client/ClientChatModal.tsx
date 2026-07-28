import React from 'react';
import {
    Modal,
    KeyboardAvoidingView,
    Platform,
    View,
    Pressable,
    Image,
    Text,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/styles/activeTaskScreen.styles';
import { ChatMessage } from '@/context/post-job';

interface ClientChatModalProps {
    visible: boolean;
    onClose: () => void;
    proAvatar?: string;
    proName: string;
    onCall: () => void;
    activeChatMessages: ChatMessage[];
    chatInput: string;
    setChatInput: (text: string) => void;
    onSendChat: () => void;
    insetsTop: number;
    insetsBottom: number;
}

export const ClientChatModal: React.FC<ClientChatModalProps> = ({
    visible,
    onClose,
    proAvatar,
    proName,
    onCall,
    activeChatMessages,
    chatInput,
    setChatInput,
    onSendChat,
    insetsTop,
    insetsBottom,
}) => {
    if (!visible) return null;

    const chatHeaderStyle = [
        styles.modalHeader,
        { paddingTop: insetsTop + (Platform.OS === 'ios' ? 12 : 16) },
    ];
    const chatInputStyle = [
        styles.inputBar,
        { paddingBottom: Math.max(insetsBottom, 12) },
    ];

    const hasValidAvatar = Boolean(proAvatar && proAvatar.trim().length > 0);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: '#F9FAFB' }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Modal Header */}
                <View style={chatHeaderStyle}>
                    <Pressable onPress={onClose} style={styles.modalBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </Pressable>
                    {hasValidAvatar ? (
                        <Image source={{ uri: proAvatar }} style={styles.modalAvatar} />
                    ) : (
                        <View style={[styles.modalAvatar, { backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
                                {(proName || 'P').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.modalHeaderDetails}>
                        <Text style={styles.modalName}>{proName}</Text>
                        <Text style={styles.modalStatus}>Active session</Text>
                    </View>
                    <Pressable onPress={onCall} style={styles.modalCallBtn}>
                        <Ionicons name="call" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>

                {/* Chat Messages */}
                <ScrollView
                    style={styles.chatMessagesList}
                    contentContainerStyle={{ padding: 16, paddingBottom: 25 }}
                >
                    <View style={styles.systemMessagePill}>
                        <Text style={styles.systemMessageText}>
                            Messages are temporary and will be cleared once this task ends.
                        </Text>
                    </View>

                    {activeChatMessages.map((msg) => {
                        const isUser = msg.sender === 'user';
                        return (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageBubbleContainer,
                                    isUser ? styles.messageUser : styles.messageOther,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.messageBubble,
                                        isUser ? styles.bubbleUser : styles.bubbleOther,
                                    ]}
                                >
                                    <Text style={isUser ? styles.bubbleUserText : styles.bubbleOtherText}>
                                        {msg.text}
                                    </Text>
                                </View>
                                <Text style={styles.messageTime}>{msg.time}</Text>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Input Bar */}
                <View style={chatInputStyle}>
                    <TextInput
                        style={styles.inputField}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        value={chatInput}
                        onChangeText={setChatInput}
                    />
                    <Pressable
                        style={[
                            styles.sendBtn,
                            chatInput.trim() === '' ? styles.sendBtnDisabled : styles.sendBtnEnabled,
                        ]}
                        onPress={onSendChat}
                        disabled={chatInput.trim() === ''}
                    >
                        <Ionicons name="send" size={18} color="#FFFFFF" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
