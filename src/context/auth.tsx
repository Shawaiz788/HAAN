import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppUser, Task } from '@/types';
import useTaskStore from '../store/taskStore';
import { getUserTasksFromBackend } from '@/services/task';
import { USER_TYPE_CLIENT } from '@/constants/userTypes';
import { syncPaymentPreferences } from '@/store/paymentStore';
import { mapBackendTaskToLocal } from '@/utils/taskMapper';
import { logger } from '@/utils/logger';

interface AuthContextType {
    user: AppUser | null;
    initializing: boolean;
    login: (user: AppUser, password?: string) => Promise<void>;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
    updateUser: (updatedFields: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    initializing: true,
    login: async () => { },
    logout: async () => { },
    reloadUser: async () => { },
    updateUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<AppUser | null>(null);

    const loadSession = async () => {
        try {
            const sessionStr = await SecureStore.getItemAsync('user_session');
            if (sessionStr) {
                const sessionUser = JSON.parse(sessionStr);
                setUser(sessionUser);
                // Background sync payment preferences on app open
                syncPaymentPreferences().catch(() => {});
            } else {
                setUser(null);
            }
        } catch (e) {
            logger.error('Error loading user session:', e);
        } finally {
            setInitializing(false);
        }
    };

    useEffect(() => {
        loadSession();
    }, []);

    const login = async (appUser: AppUser, password?: string) => {
        try {
            // Save the JWT access token and saved timestamp separately if present
            if (appUser.token) {
                await SecureStore.setItemAsync('user_token', appUser.token);
                await SecureStore.setItemAsync('user_token_saved_at', Date.now().toString());
            }
            // Save the JWT refresh token separately if present
            if (appUser.refreshToken) {
                await SecureStore.setItemAsync('user_refresh_token', appUser.refreshToken);
            }
            await SecureStore.setItemAsync('user_session', JSON.stringify(appUser));

            // Switch MMKV store user context
            useTaskStore.getState().switchUser(appUser.id ?? null);

            // Fetch tasks from backend strictly on explicit user login for Customer users
            if (appUser.id && appUser.usertype_id === USER_TYPE_CLIENT) {
                try {
                    const backendTasks = await getUserTasksFromBackend(appUser.id);
                    const mappedTasks: Task[] = (backendTasks || []).map(mapBackendTaskToLocal);
                    useTaskStore.getState().setTaskHistory(mappedTasks);
                    logger.log(`[auth login] Successfully synced ${mappedTasks.length} tasks into MMKV for User ID: ${appUser.id}`);
                } catch (err) {
                    logger.warn('[auth login] On-login task history API sync failed:', err);
                }
            }

            // Sync payment preferences on login
            syncPaymentPreferences().catch(() => {});

            setUser(appUser);
        } catch (e) {
            logger.error('Error saving user session:', e);
            throw e;
        }
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('user_session');
            await SecureStore.deleteItemAsync('user_token');
            await SecureStore.deleteItemAsync('user_refresh_token');
            await SecureStore.deleteItemAsync('user_token_saved_at');
            useTaskStore.getState().switchUser(null);
            setUser(null);
        } catch (e) {
            logger.error('Error clearing user session:', e);
            throw e;
        }
    };

    const reloadUser = async () => {
        await loadSession();
    };

    const updateUser = async (updatedFields: Partial<AppUser>) => {
        try {
            const currentSessionStr = await SecureStore.getItemAsync('user_session');
            let currentSession = user;
            if (currentSessionStr) {
                currentSession = JSON.parse(currentSessionStr);
            }
            const newSession = {
                ...currentSession,
                ...updatedFields,
            } as AppUser;

            await SecureStore.setItemAsync('user_session', JSON.stringify(newSession));
            logger.log('[SecureStore] Updated user session in SecureStore');
            setUser(newSession);
        } catch (e) {
            logger.error('Error updating user session:', e);
            throw e;
        }
    };

    return (
        <AuthContext.Provider value={{ user, initializing, login, logout, reloadUser, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
