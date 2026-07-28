import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
const PRO_ONLINE_KEY = 'pro_online_status_storage';

export interface ProOnlineStoreState {
    isOnline: boolean;
    setIsOnline: (online: boolean) => void;
    toggleOnline: () => void;
}

const loadOnlineFromMMKV = (): boolean => {
    try {
        const raw = storage.getBoolean(PRO_ONLINE_KEY);
        return raw ?? false;
    } catch (e) {
        return false;
    }
};

const saveOnlineToMMKV = (online: boolean) => {
    try {
        storage.set(PRO_ONLINE_KEY, online);
    } catch (e) {
        console.error('[proOnlineStore] Error persisting online status:', e);
    }
};

const useProOnlineStore = create<ProOnlineStoreState>()((set) => ({
    isOnline: loadOnlineFromMMKV(),
    setIsOnline: (online: boolean) => {
        saveOnlineToMMKV(online);
        set({ isOnline: online });
    },
    toggleOnline: () => {
        set((state) => {
            const next = !state.isOnline;
            saveOnlineToMMKV(next);
            return { isOnline: next };
        });
    },
}));

export default useProOnlineStore;
