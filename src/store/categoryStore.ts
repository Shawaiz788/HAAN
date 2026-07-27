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
                { id: 201, name: 'General Wet Service', image: 'snow', color: '#3B82F6', base_price: 1500 },
                { id: 202, name: 'Master Dismantle Wash', image: 'sparkles', color: '#3B82F6', base_price: 2500 },
                { id: 203, name: 'Gas Refill (R22 / R410)', image: 'funnel', color: '#3B82F6', base_price: 3500 },
                { id: 204, name: 'AC Installation', image: 'build', color: '#3B82F6', base_price: 3000 },
                { id: 205, name: 'PCB Board & Repair', image: 'construct', color: '#3B82F6', base_price: 2000 },
            ];
        }
        if (catName.includes('tutor') || catName.includes('tuition') || catName.includes('teacher')) {
            return [
                { id: 101, name: 'Primary School (Class 1-5)', image: 'school', color: '#10B981', base_price: 5000 },
                { id: 102, name: 'Matric / O-Levels Science', image: 'flask', color: '#10B981', base_price: 8000 },
                { id: 103, name: 'FSc / A-Levels Specialist', image: 'book', color: '#10B981', base_price: 12000 },
                { id: 104, name: 'Quran & Tajweed Lessons', image: 'ribbon', color: '#10B981', base_price: 3000 },
            ];
        }
        if (catName.includes('electric') || catName.includes('wiring')) {
            return [
                { id: 301, name: 'Switch & Socket Repair', image: 'flash', color: '#F97316', base_price: 500 },
                { id: 302, name: 'Fan Fitting & Repair', image: 'options', color: '#F97316', base_price: 800 },
                { id: 303, name: 'Light & Chandelier Fitting', image: 'bulb', color: '#F97316', base_price: 1000 },
                { id: 304, name: 'UPS & Inverter Wiring', image: 'hardware-chip', color: '#F97316', base_price: 1500 },
                { id: 305, name: 'Full Wiring Check / Repair', image: 'construct', color: '#F97316', base_price: 2000 },
            ];
        }
        if (catName.includes('plumb') || catName.includes('pipe')) {
            return [
                { id: 401, name: 'Tap & Mixer Repair', image: 'water', color: '#A855F7', base_price: 500 },
                { id: 402, name: 'Drainage Unclogging', image: 'construct', color: '#A855F7', base_price: 1200 },
                { id: 403, name: 'Water Tank Cleaning', image: 'sparkles', color: '#A855F7', base_price: 2500 },
                { id: 404, name: 'Commode / WC Fitting', image: 'build', color: '#A855F7', base_price: 1800 },
                { id: 405, name: 'Motor Pump Repair', image: 'hardware-chip', color: '#A855F7', base_price: 1000 },
            ];
        }
        if (catName.includes('mehndi') || catName.includes('henna')) {
            return [
                { id: 701, name: 'Casual / Party Hands', image: 'leaf', color: '#84CC16', base_price: 1000 },
                { id: 702, name: 'Semi-Bridal Mehndi', image: 'flower', color: '#84CC16', base_price: 4000 },
                { id: 703, name: 'Full Bridal Henna', image: 'sparkles', color: '#84CC16', base_price: 8000 },
                { id: 704, name: 'Kids Mehndi', image: 'heart', color: '#84CC16', base_price: 500 },
            ];
        }
        if (catName.includes('clean') || catName.includes('maid')) {
            return [
                { id: 501, name: 'Sofa & Carpet Wash', image: 'home', color: '#EAB308', base_price: 2000 },
                { id: 502, name: 'Deep Kitchen Cleaning', image: 'restaurant', color: '#EAB308', base_price: 3000 },
                { id: 503, name: 'Full House Deep Cleaning', image: 'sparkles', color: '#EAB308', base_price: 8000 },
                { id: 504, name: 'Water Tank Sanitization', image: 'water', color: '#EAB308', base_price: 2500 },
            ];
        }
        if (catName.includes('paint')) {
            return [
                { id: 601, name: 'Single Room Painting', image: 'brush', color: '#EC4899', base_price: 4000 },
                { id: 602, name: 'Feature Wall Texture', image: 'color-palette', color: '#EC4899', base_price: 3500 },
                { id: 603, name: 'Door & Window Polish', image: 'build', color: '#EC4899', base_price: 1500 },
                { id: 604, name: 'Waterproofing Treatment', image: 'shield', color: '#EC4899', base_price: 3000 },
            ];
        }
        if (catName.includes('mason') || catName.includes('labor') || catName.includes('construction')) {
            return [
                { id: 801, name: 'Tile & Marble Fitting', image: 'grid', color: '#F43F5E', base_price: 2000 },
                { id: 802, name: 'Wall Plaster & Patchwork', image: 'hammer', color: '#F43F5E', base_price: 1500 },
                { id: 803, name: 'Brickwork & Masonry', image: 'construct', color: '#F43F5E', base_price: 2500 },
            ];
        }
        if (catName.includes('cook') || catName.includes('chef')) {
            return [
                { id: 901, name: 'Daily Household Meal Cook', image: 'restaurant', color: '#F97316', base_price: 8000 },
                { id: 902, name: 'One-Time Party / Event Cook', image: 'flame', color: '#F97316', base_price: 3500 },
                { id: 903, name: 'Special Daawat / Deg Cook', image: 'cafe', color: '#F97316', base_price: 5000 },
            ];
        }
        if (catName.includes('driver')) {
            return [
                { id: 1001, name: 'Outstation / Inter-city Trip', image: 'car', color: '#06B6D4', base_price: 2500 },
                { id: 1002, name: 'Short City Trip (3 hrs)', image: 'time', color: '#06B6D4', base_price: 800 },
                { id: 1003, name: 'Monthly Full-time Driver', image: 'calendar', color: '#06B6D4', base_price: 25000 },
            ];
        }
        if (catName.includes('other') || catName.includes('general')) {
            return [
                { id: 1101, name: 'General Handyman', image: 'construct', color: '#64748B', base_price: 500 },
                { id: 1102, name: 'Furniture Repair & Fitting', image: 'hammer', color: '#64748B', base_price: 1000 },
                { id: 1103, name: 'Appliance Repair', image: 'cog', color: '#64748B', base_price: 1200 },
            ];
        }

        return [];
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
