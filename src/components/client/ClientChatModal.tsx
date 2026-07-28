import React from 'react';
import { TaskChatModal } from '../common/TaskChatModal';

interface ClientChatModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: number | string | null;
  proAvatar?: string;
  proName: string;
  onCall: () => void;
  activeChatMessages?: any[];
  chatInput?: string;
  setChatInput?: (text: string) => void;
  onSendChat?: () => void;
  insetsTop?: number;
  insetsBottom?: number;
}

export const ClientChatModal: React.FC<ClientChatModalProps> = ({
  visible,
  onClose,
  taskId,
  proAvatar,
  proName,
  onCall,
}) => {
  return (
    <TaskChatModal
      visible={visible}
      onClose={onClose}
      taskId={taskId}
      otherUserName={proName}
      otherUserAvatar={proAvatar}
      onCall={onCall}
      role="customer"
    />
  );
};
