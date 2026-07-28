export interface Category {
  id?: number;
  name: string;
  color?: string;
  image?: string; // Ionicons icon key (e.g. 'flash', 'build')
  commission_rate?: number;
  is_active?: boolean;
  total_jobs?: number;
  subcategories?: SubCategory[];
  /** Alias for commission_rate */
  commissionRate?: number;
  /** Alias for is_active */
  active?: boolean;
  /** Alias for total_jobs */
  totalJobs?: number;
}

export interface SubCategory {
  id?: number;
  name: string;
  color?: string;
  image?: string; // Ionicons icon key
  category_id?: number;
  category?: Category | { id?: number; name: string; color?: string; image?: string };
  base_price?: number;
  /** Alias for base_price */
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
