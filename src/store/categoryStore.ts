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

    /** Look up category and subcategory by subcategory_id. */
    getCategoryAndSubcategoryBySubId: (subId: number) => {
        category: Category | undefined;
        subcategory: SubCategory | undefined;
    };
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
            // console.log(
            //     '[categoryStore] Loaded categories count:',
            //     catData?.length,
            //     'Subcategories count:',
            //     subData?.length
            // );
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

        // Return matching subcategories from backend API list, or empty array if none assigned
        return matchedSubs;
    },

    getStyleById: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        return getCategoryStyle(cat);
    },

    getCategoryAndSubcategoryBySubId: (subId) => {
        const { categories, subcategories } = get();
        const sub = subcategories.find((s: any) => Number(s.id) === Number(subId));

        if (!sub) {
            // Fallback: check if subId was directly a category id
            const cat = categories.find((c) => Number(c.id) === Number(subId));
            if (cat) {
                return { category: cat, subcategory: undefined };
            }
            return { category: undefined, subcategory: undefined };
        }

        const catId =
            sub.category_id !== undefined && sub.category_id !== null
                ? sub.category_id
                : typeof sub.category === 'object' && sub.category !== null
                    ? sub.category.id
                    : typeof sub.category === 'number'
                        ? sub.category
                        : null;

        const cat = categories.find((c) => Number(c.id) === Number(catId));

        return { category: cat, subcategory: sub };
    },
}));

export default useCategoryStore;
