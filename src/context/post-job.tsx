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
    attachmentUris?: string[] | null
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

  const syncedUsersRef = useRef<Set<number>>(new Set());

  const biddingTimer = useRef<NodeJS.Timeout | null>(null);
  const chatGreetingTimer = useRef<NodeJS.Timeout | null>(null);
  const chatReplyTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle user account switching (loads from MMKV cache instantly) & sync active task from backend
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
        console.log(`[PostJobProvider] Syncing customer tasks from backend (/app/task/customer/${userId}/)...`);
        const backendTasks = await getUserTasksFromBackend(userId);
        if (!isMounted) return;

        const currentActive = useTaskStore.getState().activeTask;

        if (Array.isArray(backendTasks) && backendTasks.length > 0) {
          const mappedTasks: Task[] = backendTasks.map((bt) => {
            let status: Task['status'] = 'searching';
            if (bt.status_id === 4) {
              status = 'completed';
            } else if (bt.status_id === 5 || bt.status_id === 3) {
              status = 'cancelled';
            } else if (bt.status_id === 2) {
              status = 'accepted';
            } else {
              status = 'bidding';
            }

            return {
              id: bt.id ? bt.id.toString() : Date.now().toString(),
              backend_id: bt.id,
              category: bt.subject || 'General Task',
              description: bt.body || '',
              budget: bt.price || 0,
              locationName: 'Specified Location',
              paymentPref: 'Cash',
              status,
              createdAt: bt.created_at || new Date().toISOString(),
            };
          });

          setTaskHistory(mappedTasks);

          // Find active tasks (status is searching, bidding, or accepted)
          const activeBackendTasks = mappedTasks.filter(
            (t) => t.status === 'searching' || t.status === 'bidding' || t.status === 'accepted'
          );

          if (activeBackendTasks.length > 0) {
            // Sort by backend_id descending to select the latest active task
            activeBackendTasks.sort((a, b) => (b.backend_id || 0) - (a.backend_id || 0));
            const latestActive = activeBackendTasks[0];

            if (!currentActive || currentActive.backend_id !== latestActive.backend_id || currentActive.status !== latestActive.status) {
              console.log(`[PostJobProvider] Linked active task from backend: ID ${latestActive.backend_id}`);
              setStoreActiveTask({
                ...latestActive,
                ...(currentActive && currentActive.backend_id === latestActive.backend_id ? currentActive : {}),
                status: latestActive.status,
              });
            }
          } else {
            // No active task on backend - clear local active task if linked to backend
            if (currentActive && currentActive.backend_id) {
              console.log('[PostJobProvider] Clearing active task as backend reports no active tasks.');
              setStoreActiveTask(null);
            }
          }
        } else {
          // Backend returned no tasks array or empty list - clear stale MMKV active task
          if (currentActive && currentActive.backend_id) {
            console.log('[PostJobProvider] Backend returned 0 tasks. Clearing stale MMKV active task.');
            setStoreActiveTask(null);
          }
        }

        // Additional explicit check: if currentActive exists with a backend_id, verify that specific task
        const updatedCurrentActive = useTaskStore.getState().activeTask;
        if (updatedCurrentActive && updatedCurrentActive.backend_id) {
          const singleTask = await getTaskByIdFromBackend(updatedCurrentActive.backend_id);
          if (!isMounted) return;
          if (!singleTask || singleTask.status_id === 5 || singleTask.status_id === 3) {
            console.log(`[PostJobProvider] Active task ${updatedCurrentActive.backend_id} is deleted/cancelled on backend. Clearing MMKV.`);
            setStoreActiveTask(null);
          }
        }
      } catch (err) {
        console.warn('[PostJobProvider] Sync customer tasks API call failed:', err);
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
    attachmentUris?: string[] | null
  ) => {
    if (activeTask && (activeTask.status === 'searching' || activeTask.status === 'bidding' || activeTask.status === 'accepted')) {
      console.warn('[PostJobProvider] Blocked creating second task: active task already in progress.');
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
    setCreationStep('Creating task on server...');

    const userId = user?.id;
    const locationId = user?.location_id || user?.location?.id || 1;

    if (userId) {
      (async () => {
        try {
          console.log('[PostJobProvider] Dispatching createTaskChain with:', {
            subcategoryId,
            categoryName,
            subcategoryName,
            paymentPreferenceId,
            budget,
            userId,
            locationId,
            attachmentUris,
          });

          if (attachmentUris && attachmentUris.length > 0) {
            setCreationStep('Uploading attachments & pictures...');
          }

          const createdBackend = await createTaskChain({
            subcategoryId,
            categoryName,
            subcategoryName,
            paymentPreferenceId,
            description,
            budget,
            userId,
            locationId,
            attachmentUris,
          });
          console.log('[PostJobProvider] Backend task created successfully. ID:', createdBackend.id);

          setCreationStep('Connecting to live bidding network...');

          if (createdBackend && createdBackend.id) {
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
          console.error('[PostJobProvider] Failed to submit task to backend database:', err);
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
      console.warn('[PostJobProvider] Cannot dispatch backend createTask: missing user ID.');
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
        console.log('[PostJobProvider] Soft-deleting backend task with ID:', taskId);
        await softDeleteTaskOnBackend(taskId);
        console.log('[PostJobProvider] Backend task soft-deleted successfully.');
      } catch (deleteErr) {
        console.warn('[PostJobProvider] Soft-delete task API call warning:', deleteErr);
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

    // Simulate reply after 1.5s
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
