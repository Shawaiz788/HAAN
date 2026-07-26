export interface Category {
  id?: number;
  name: string;
  color?: string;
  image?: string; // Ionicons icon key (e.g. 'flash', 'build')
  commission_rate?: number;
  commissionRate?: number;
  is_active?: boolean;
  active?: boolean;
  total_jobs?: number;
  totalJobs?: number;
  subcategories?: SubCategory[];
}

export interface SubCategory {
  id?: number;
  name: string;
  color?: string;
  image?: string; // Ionicons icon key
  category_id?: number;
  category?: Category | { id?: number; name: string; color?: string; image?: string };
  base_price?: number;
  basePrice?: number;
}

export interface CreateCategoryPayload {
  name: string;
  color: string;
  image: string;
}

export interface CreateSubCategoryPayload {
  name: string;
  color: string;
  image: string;
  category_id: number;
  base_price: number;
}
