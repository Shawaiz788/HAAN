import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth';
import {
  createTaskChain,
  softDeleteTaskOnBackend,
  getUserTasksFromBackend,
  getTaskByIdFromBackend,
} from '@/services/task';
import useTaskStore from '../store/taskStore';
import { TASK_STATUS } from '@/constants/taskStatus';
import { mapBackendTaskToLocal } from '@/utils/taskMapper';
import { logger } from '@/utils/logger';
import { Bid, Task, ChatMessage } from '@/types';
export { Bid, Task, ChatMessage };

interface PostJobContextType {
  activeTask: Task | null;
  taskHistory: Task[];
  bids: Bid[];
  activeChatMessages: ChatMessage[];
  selectedCategory: string | null;
  isCreatingTask: boolean;
  creationStep: string;
  createTask: (
    subcategoryId: number,
    categoryName: string,
    subcategoryName: string,
    paymentPreferenceId: number,
    paymentPreferenceName: string,
    description: string,
    budget: number,
    locationName: string,
    attachmentUris?: string[] | null,
    latitude?: number,
    longitude?: number
  ) => void;
  cancelTask: (onProgress?: (msg: string) => void) => Promise<boolean>;
  acceptBid: (bidId: string, bidObj?: Bid) => void;
  completeTask: () => void;
  sendActiveChatMessage: (text: string) => void;
  clearHistory: () => void;
  openPostJob: (category?: string) => void;
  closePostJob: () => void;
}

const PostJobContext = createContext<PostJobContextType>({
  activeTask: null,
  taskHistory: [],
  bids: [],
  activeChatMessages: [],
  selectedCategory: null,
  isCreatingTask: false,
  creationStep: '',
  createTask: () => { },
  cancelTask: async () => false,
  acceptBid: () => { },
  completeTask: () => { },
  sendActiveChatMessage: () => { },
  clearHistory: () => { },
  openPostJob: () => { },
  closePostJob: () => { },
});

export function PostJobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { taskHistory, activeTask, switchUser, setTaskHistory, addTaskToHistory, setActiveTask: setStoreActiveTask, clearHistory: clearTaskStoreHistory } = useTaskStore();

  const setActiveTask = (taskOrUpdater: Task | null | ((prev: Task | null) => Task | null)) => {
    if (typeof taskOrUpdater === 'function') {
      const current = useTaskStore.getState().activeTask;
      const next = taskOrUpdater(current);
      setStoreActiveTask(next);
    } else {
      setStoreActiveTask(taskOrUpdater);
    }
  };

  const [bids, setBids] = useState<Bid[]>([]);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [creationStep, setCreationStep] = useState<string>('');

  const biddingTimer = useRef<NodeJS.Timeout | null>(null);
  const chatGreetingTimer = useRef<NodeJS.Timeout | null>(null);
  const chatReplyTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle user account switching & sync active task from backend
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      switchUser(null);
      return;
    }
    switchUser(userId);

    let isMounted = true;
    (async () => {
      try {
        logger.log(`[PostJobProvider] Syncing customer tasks from backend (/app/task/customer/${userId}/)...`);
        const backendTasks = await getUserTasksFromBackend(userId);
        if (!isMounted) return;

        const currentActive = useTaskStore.getState().activeTask;

        if (Array.isArray(backendTasks) && backendTasks.length > 0) {
          const mappedTasks: Task[] = backendTasks.map(mapBackendTaskToLocal);
          setTaskHistory(mappedTasks);

          // Find active tasks (status is searching, bidding, or accepted)
          const activeBackendTasks = mappedTasks.filter(
            (t) => t.status === 'searching' || t.status === 'bidding' || t.status === 'accepted'
          );

          if (activeBackendTasks.length > 0) {
            activeBackendTasks.sort((a, b) => (b.backend_id || 0) - (a.backend_id || 0));
            const latestActive = activeBackendTasks[0];

            if (!currentActive || currentActive.backend_id !== latestActive.backend_id || currentActive.status !== latestActive.status) {
              logger.log(`[PostJobProvider] Linked active task from backend: ID ${latestActive.backend_id}`);
              setStoreActiveTask({
                ...latestActive,
                ...(currentActive && currentActive.backend_id === latestActive.backend_id ? currentActive : {}),
                status: latestActive.status,
              });
            }
          } else if (currentActive?.backend_id) {
            logger.log('[PostJobProvider] Clearing active task as backend reports no active tasks.');
            setStoreActiveTask(null);
          }
        } else if (currentActive?.backend_id) {
          logger.log('[PostJobProvider] Backend returned 0 tasks. Clearing stale MMKV active task.');
          setStoreActiveTask(null);
        }

        // Verify current active task still exists on backend
        const updatedCurrentActive = useTaskStore.getState().activeTask;
        if (updatedCurrentActive?.backend_id) {
          const singleTask = await getTaskByIdFromBackend(updatedCurrentActive.backend_id);
          if (!isMounted) return;
          if (!singleTask || singleTask.status_id === TASK_STATUS.CANCELLED || singleTask.status_id === TASK_STATUS.CANCELLED_BY_SYSTEM) {
            logger.log(`[PostJobProvider] Active task ${updatedCurrentActive.backend_id} is deleted/cancelled on backend. Clearing MMKV.`);
            setStoreActiveTask(null);
          }
        }
      } catch (err) {
        logger.warn('[PostJobProvider] Sync customer tasks API call failed:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (biddingTimer.current) clearTimeout(biddingTimer.current);
      if (chatGreetingTimer.current) clearTimeout(chatGreetingTimer.current);
      if (chatReplyTimer.current) clearTimeout(chatReplyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (activeTask) {
      addTaskToHistory(activeTask);
    }
  }, [activeTask]);

  const openPostJob = (cat?: string) => {
    if (cat) {
      setSelectedCategory(cat);
    }
  };

  const closePostJob = () => {
    setSelectedCategory(null);
  };

  const createTask = (
    subcategoryId: number,
    categoryName: string,
    subcategoryName: string,
    paymentPreferenceId: number,
    paymentPreferenceName: string,
    description: string,
    budget: number,
    locationName: string,
    attachmentUris?: string[] | null,
    latitude?: number,
    longitude?: number
  ) => {
    if (activeTask && (activeTask.status === 'searching' || activeTask.status === 'bidding' || activeTask.status === 'accepted')) {
      logger.warn('[PostJobProvider] Blocked creating second task: active task already in progress.');
      return;
    }

    const categoryLabel = subcategoryName ? `${categoryName} (${subcategoryName})` : categoryName;

    const newTask: Task = {
      id: Date.now().toString(),
      category: categoryLabel,
      description,
      budget,
      locationName,
      paymentPref: paymentPreferenceName,
      status: 'searching',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentUris,
    };

    setActiveTask(newTask);
    addTaskToHistory(newTask);
    setBids([]);
    setActiveChatMessages([]);
    setIsCreatingTask(true);
    setCreationStep(latitude && longitude ? 'Resolving & creating task location...' : 'Creating task on server...');

    const userId = user?.id;
    const defaultLocationId = user?.location_id || user?.location?.id || 1;

    if (userId) {
      (async () => {
        try {
          const createdBackend = await createTaskChain({
            subcategoryId,
            categoryName,
            subcategoryName,
            paymentPreferenceId,
            description,
            budget,
            userId,
            locationId: defaultLocationId,
            latitude,
            longitude,
            formattedAddress: locationName,
            attachmentUris,
            onProgress: (stepMsg) => setCreationStep(stepMsg),
          });
          logger.log('[PostJobProvider] Backend task created successfully. ID:', createdBackend.id);

          setCreationStep('Connecting to live bidding network...');

          if (createdBackend?.id) {
            const realId = createdBackend.id;
            setActiveTask((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                id: realId.toString(),
                backend_id: realId,
                status: 'bidding' as const,
              };
            });

            if (createdBackend._failedAttachmentCount && createdBackend._failedAttachmentCount > 0) {
              Alert.alert(
                'Attachment Upload Warning',
                `Your task was created successfully, but ${createdBackend._failedAttachmentCount} attachment photo(s) failed to upload.`
              );
            }
          }
          setIsCreatingTask(false);
          setCreationStep('');
        } catch (err: any) {
          logger.error('[PostJobProvider] Failed to submit task to backend database:', err);
          setIsCreatingTask(false);
          setCreationStep('');
          setActiveTask(null);
          Alert.alert(
            'Task Creation Failed',
            err.message || 'Unable to publish task to server. Please check your internet connection and try again.'
          );
        }
      })();
    } else {
      logger.warn('[PostJobProvider] Cannot dispatch backend createTask: missing user ID.');
      setIsCreatingTask(false);
    }

    if (biddingTimer.current) clearTimeout(biddingTimer.current);
  };

  const cancelTask = async (onProgress?: (msg: string) => void): Promise<boolean> => {
    if (!activeTask) {
      setActiveTask(null);
      setBids([]);
      setActiveChatMessages([]);
      return true;
    }

    const taskId = activeTask.backend_id;
    if (taskId) {
      try {
        onProgress?.('Cancelling request on server...');
        logger.log('[PostJobProvider] Soft-deleting backend task with ID:', taskId);
        await softDeleteTaskOnBackend(taskId);
        logger.log('[PostJobProvider] Backend task soft-deleted successfully.');
      } catch (deleteErr) {
        logger.warn('[PostJobProvider] Soft-delete task API call warning:', deleteErr);
      }
    }

    const cancelledTask: Task = { ...activeTask, status: 'cancelled' };
    addTaskToHistory(cancelledTask);

    setActiveTask(null);
    setBids([]);
    setActiveChatMessages([]);
    if (biddingTimer.current) clearTimeout(biddingTimer.current);
    if (chatGreetingTimer.current) clearTimeout(chatGreetingTimer.current);
    if (chatReplyTimer.current) clearTimeout(chatReplyTimer.current);
    return true;
  };

  const acceptBid = (bidId: string, bidObj?: Bid) => {
    if (!activeTask) return;

    const chosenBid: Bid = bidObj || bids.find((b) => b.id === bidId) || {
      id: bidId,
      name: 'Service Provider',
      avatar: '',
      rating: 4.8,
      reviewsCount: 0,
      price: activeTask.budget,
      timeEstimate: '15 min',
      message: 'Bid accepted',
      is_profile_loading: true,
    };

    setActiveTask((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'accepted' as const,
        acceptedBid: chosenBid,
      };
    });

    // Start greeting after 2 seconds
    if (chatGreetingTimer.current) clearTimeout(chatGreetingTimer.current);
    chatGreetingTimer.current = setTimeout(() => {
      const greetingMsg: ChatMessage = {
        id: 'greet_1',
        text: `Hello, I'm ${chosenBid.name.split(' ')[0]}. I'm on my way to your location! Please share any details or gate codes if needed.`,
        sender: 'professional',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActiveChatMessages((prev) => [...prev, greetingMsg]);
    }, 2000);
  };

  const completeTask = () => {
    if (activeTask) {
      const completedTask: Task = { ...activeTask, status: 'completed' };
      addTaskToHistory(completedTask);
      Alert.alert('Task Completed', 'The task has been marked as completed successfully!');
    }
    setActiveTask(null);
    setBids([]);
    setActiveChatMessages([]);
    if (biddingTimer.current) clearTimeout(biddingTimer.current);
    if (chatGreetingTimer.current) clearTimeout(chatGreetingTimer.current);
    if (chatReplyTimer.current) clearTimeout(chatReplyTimer.current);
  };

  const sendActiveChatMessage = (text: string) => {
    if (text.trim() === '') return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveChatMessages((prev) => [...prev, newMsg]);

    // Simulated reply — only active in development builds
    if (__DEV__) {
      if (chatReplyTimer.current) clearTimeout(chatReplyTimer.current);
      chatReplyTimer.current = setTimeout(() => {
        const replies = [
          "Sounds good! I'll be there in a bit.",
          "Got it, thanks for letting me know.",
          "Understood, I am on my way.",
          "Perfect. I am driving right now, will arrive soon.",
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const replyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: randomReply,
          sender: 'professional',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setActiveChatMessages((prev) => [...prev, replyMsg]);
      }, 1500);
    }
  };

  const clearHistory = () => {
    clearTaskStoreHistory();
  };

  return (
    <PostJobContext.Provider
      value={{
        activeTask,
        taskHistory,
        bids,
        activeChatMessages,
        selectedCategory,
        isCreatingTask,
        creationStep,
        createTask,
        cancelTask,
        acceptBid,
        completeTask,
        sendActiveChatMessage,
        clearHistory,
        openPostJob,
        closePostJob,
      }}
    >
      {children}
    </PostJobContext.Provider>
  );
}

export const usePostJob = () => useContext(PostJobContext);
