import { create } from 'zustand';
import { getCategoriesFromBackend } from '@/services/task';
import { Category } from '@/types';

/** Resolve the icon name + accent color dynamically from category backend metadata. */
export function getCategoryStyle(catOrName?: any): { icon: string; color: string } {
    if (!catOrName) {
        return { icon: 'flash', color: '#10B981' };
    }

    // 1. If a category object is passed directly (e.g. from backend list)
    if (typeof catOrName === 'object' && catOrName !== null) {
        const icon = catOrName.image || catOrName.icon || 'flash';
        const color = catOrName.color || '#10B981';
        return { icon, color };
    }

    // 2. If a category string (name) or number (id) is passed, resolve from loaded categories
    const storeCategories = useCategoryStore.getState().categories || [];
    const searchStr = String(catOrName).trim().toLowerCase();

    const matched = storeCategories.find(
        (c) =>
            String(c.id) === searchStr ||
            c.name.toLowerCase() === searchStr ||
            c.name.toLowerCase().includes(searchStr)
    );

    if (matched) {
        return {
            icon: (matched as any).image || (matched as any).icon || 'flash',
            color: matched.color || '#10B981',
        };
    }

    return { icon: 'flash', color: '#10B981' };
}

// ─── Category Store ─────────────────────────────────────────────────────────────

interface CategoryStoreState {
    /** Flat list fetched from the API. Empty until first successful fetch. */
    categories: Category[];
    /** True while a fetch is in flight. */
    loading: boolean;
    /** Whether the fetch has already completed at least once this session. */
    fetched: boolean;

    /** Fetch from API only if not already fetched this session. */
    ensureCategories: () => Promise<void>;

    /** Look up a category by its numeric id. Returns undefined if not loaded yet. */
    getCategoryById: (id: number) => Category | undefined;

    /** Convenience: icon + color for a given category id or name. */
    getStyleById: (id: number) => { icon: string; color: string };
}

const useCategoryStore = create<CategoryStoreState>((set, get) => ({
    categories: [],
    loading: false,
    fetched: false,

    ensureCategories: async () => {
        const { fetched, loading } = get();
        if (fetched || loading) return; // already loaded or in-flight

        set({ loading: true });
        try {
            const data = await getCategoriesFromBackend();
            set({ categories: data, fetched: true });
        } catch (err) {
            console.error('[categoryStore] Failed to fetch categories:', err);
            // Don't mark as fetched so we can retry on next call
        } finally {
            set({ loading: false });
        }
    },

    getCategoryById: (id) => get().categories.find((c) => c.id === id),

    getStyleById: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        return getCategoryStyle(cat);
    },
}));

export default useCategoryStore;
