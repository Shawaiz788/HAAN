import { create } from 'zustand';
import { getCategoriesFromBackend } from '@/services/task';
import { categoryService } from '@/services/category';
import { Category, SubCategory } from '@/types/category';

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
    /** List of all subcategories fetched from the API. */
    subcategories: SubCategory[];
    /** True while a fetch is in flight. */
    loading: boolean;
    /** Whether the fetch has already completed at least once this session. */
    fetched: boolean;

    /** Fetch from API only if not already fetched this session. */
    ensureCategories: () => Promise<void>;

    /** Look up a category by its numeric id. Returns undefined if not loaded yet. */
    getCategoryById: (id: number) => Category | undefined;

    /** Look up subcategories belonging to a given category id or name. */
    getSubcategoriesByCategory: (catIdOrName: number | string) => SubCategory[];

    /** Convenience: icon + color for a given category id or name. */
    getStyleById: (id: number) => { icon: string; color: string };
}

const useCategoryStore = create<CategoryStoreState>((set, get) => ({
    categories: [],
    subcategories: [],
    loading: false,
    fetched: false,

    ensureCategories: async () => {
        const { categories, subcategories, loading } = get();
        if (loading) return;
        if (categories.length > 0 && subcategories.length > 0) return;

        set({ loading: true });
        try {
            console.log('[categoryStore] Fetching categories and subcategories...');
            const [catData, subData] = await Promise.all([
                getCategoriesFromBackend().catch(() => categories),
                categoryService.getSubcategories().catch((err) => {
                    console.warn('[categoryStore] Non-fatal error fetching subcategories:', err);
                    return subcategories;
                }),
            ]);
            console.log(
                '[categoryStore] Loaded categories count:',
                catData?.length,
                'Subcategories count:',
                subData?.length
            );
            set({ categories: catData || [], subcategories: subData || [], fetched: true });
        } catch (err) {
            console.error('[categoryStore] Failed to fetch categories/subcategories:', err);
        } finally {
            set({ loading: false });
        }
    },

    getCategoryById: (id) => get().categories.find((c) => c.id === id),

    getSubcategoriesByCategory: (catIdOrName) => {
        const { categories, subcategories } = get();
        const searchStr = String(catIdOrName).trim().toLowerCase();

        const cat = categories.find(
            (c) => String(c.id) === searchStr || c.name.toLowerCase() === searchStr
        );

        const catName = cat ? cat.name.toLowerCase() : searchStr;

        // 1. Try finding matching subcategories in loaded subcategories list
        const matchedSubs = subcategories.filter((s: any) => {
            const subCatId =
                s.category_id !== undefined && s.category_id !== null
                    ? s.category_id
                    : typeof s.category === 'object' && s.category !== null
                    ? s.category.id
                    : typeof s.category === 'number'
                    ? s.category
                    : null;

            const subCatName =
                typeof s.category === 'object' && s.category !== null && s.category.name
                    ? s.category.name
                    : s.category_name || (typeof s.category === 'string' ? s.category : null);

            if (cat && subCatId !== null && subCatId !== undefined) {
                if (String(subCatId) === String(cat.id)) return true;
            }

            if (subCatName) {
                if (subCatName.toLowerCase() === catName || catName.includes(subCatName.toLowerCase())) return true;
            }

            return false;
        });

        if (matchedSubs.length > 0) {
            return matchedSubs;
        }

        // 2. Dynamic specialty fallbacks if backend subcategories are unassigned
        if (catName.includes('ac') || catName.includes('hvac') || catName.includes('cooling')) {
            return [
                { id: 201, name: 'Cleaning', image: 'sparkles', color: '#3B82F6' },
                { id: 202, name: 'Installation', image: 'build', color: '#3B82F6' },
                { id: 203, name: 'Repair', image: 'construct', color: '#3B82F6' },
                { id: 204, name: 'Gas Refill', image: 'snow', color: '#3B82F6' },
            ];
        }
        if (catName.includes('tutor') || catName.includes('tuition') || catName.includes('teacher')) {
            return [
                { id: 101, name: 'Math', image: 'school', color: '#10B981' },
                { id: 102, name: 'English', image: 'book', color: '#10B981' },
                { id: 103, name: 'Physics', image: 'flask', color: '#10B981' },
                { id: 104, name: 'Chemistry', image: 'analytics', color: '#10B981' },
            ];
        }
        if (catName.includes('electric') || catName.includes('wiring')) {
            return [
                { id: 301, name: 'Wiring', image: 'flash', color: '#F97316' },
                { id: 302, name: 'UPS & Inverter', image: 'hardware-chip', color: '#F97316' },
                { id: 303, name: 'Appliance Repair', image: 'construct', color: '#F97316' },
                { id: 304, name: 'Light & Fan Fitting', image: 'bulb', color: '#F97316' },
            ];
        }
        if (catName.includes('plumb') || catName.includes('pipe')) {
            return [
                { id: 401, name: 'Leakage Fixing', image: 'water', color: '#A855F7' },
                { id: 402, name: 'Tap Fitting', image: 'build', color: '#A855F7' },
                { id: 403, name: 'Drainage Clear', image: 'construct', color: '#A855F7' },
                { id: 404, name: 'Motor Installation', image: 'options', color: '#A855F7' },
            ];
        }
        if (catName.includes('clean') || catName.includes('maid')) {
            return [
                { id: 501, name: 'Deep Cleaning', image: 'sparkles', color: '#EAB308' },
                { id: 502, name: 'Sofa & Carpet', image: 'home', color: '#EAB308' },
                { id: 503, name: 'Water Tank', image: 'water', color: '#EAB308' },
            ];
        }
        if (catName.includes('paint')) {
            return [
                { id: 601, name: 'Wall Painting', image: 'brush', color: '#EC4899' },
                { id: 602, name: 'Wood Polish', image: 'color-palette', color: '#EC4899' },
                { id: 603, name: 'Waterproofing', image: 'shield', color: '#EC4899' },
            ];
        }

        return [];
    },

    getStyleById: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        return getCategoryStyle(cat);
    },
}));

export default useCategoryStore;
