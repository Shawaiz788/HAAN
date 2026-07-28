// ─── Location Types ───────────────────────────────────────────────────────────
export interface Country {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  country?: number;
}

export interface Area {
  id: number;
  name: string;
  city?: number;
}

export interface UserLocation {
  id?: number;
  house_number?: number;
  street_number?: string;
  area?: number;
  city?: number;
  country?: number;
  area_id?: number;
  city_id?: number;
  country_id?: number;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
  zip_code?: number;
}

// ─── User & Authentication Types ──────────────────────────────────────────────
export interface User {
  id?: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email: string;
  gender: string;
  password?: string;
  overall_rating?: number;
  usertype_id: number;
  location_id?: number;
  location?: any;
  profile_pic?: string;
  image?: string;
}

export interface AppUser extends User {
  uid: string;
  displayName?: string;
  phoneNumber?: string; // Firebase field
  location?: UserLocation;
  token?: string;      // JWT access token
  refreshToken?: string; // JWT refresh token
}

export interface UserType {
  id: number;
  name: string;
}

// ─── Pro Earnings Types ───────────────────────────────────────────────────────
export interface ProEarnings {
  id?: number;
  worker_id: number;
  daily_earning: number;
  weekly_earning: number;
  total_earning: number;
  jobs_done?: number;
  total_jobs_done?: number;
  updated_at?: string;
  daily_jobs_done: number;
}

// ─── Customer Profile Types ──────────────────────────────────────────────────
export interface CustomerProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  location_id?: number;
  gender?: string;
  overall_rating?: number;
  is_verified?: boolean;
  usertype_id?: number;
  image?: string | null;
}

// ─── Pro Live Jobs Types ──────────────────────────────────────────────────────
export interface LiveJob {
  id: number;
  title: string;
  category: string;
  subcategory?: string;
  subcategory_id?: number;
  category_icon?: string;
  category_color?: string;
  budget: number;
  distance_km?: number;
  location_name: string;
  location_area?: string;
  customer_id?: number;
  customer_name: string;
  customer_rating?: number;
  customer_image?: string;
  customer_profile?: CustomerProfile;
  scheduled_date?: string;
  created_at?: string;
  description?: string;
  attachments?: any[];
  is_location_loading?: boolean;
  is_customer_loading?: boolean;
  payment_preference_id?: number;
  latitude?: number;
  longitude?: number;
}

// ─── Client Post Job & Bid Types ──────────────────────────────────────────────
export interface Bid {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewsCount: number;
  price: number;
  timeEstimate: string;
  message: string;
  user_id?: number;
  phone_number?: string;
  is_profile_loading?: boolean;
  worker_profile?: CustomerProfile;
}

export interface Task {
  id: string;
  category: string;
  description: string;
  budget: number;
  locationName: string;
  paymentPref: string;
  status: 'searching' | 'bidding' | 'accepted' | 'completed' | 'cancelled';
  acceptedBid?: Bid;
  createdAt: string;
  backend_id?: number;
  attachmentUris?: string[] | null;
}

// ─── Backend API task models ──────────────────────────────────────────────────
export * from './category';

export interface PaymentPreference {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
}

export interface BackendTask {
  id?: number;
  subject: string;
  body: string;
  price: number;
  created_at?: string;
  created_by: number;
  preferred_time: string;
  location_id: number;
  status_id: number;
  payment_preference_id: number;
  accurately_estimated: number;
  subcategory_id: number;
  category_id?: number;
  _failedAttachmentCount?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'professional';
  time: string;
}

export interface Pro {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  location: string;
  price: string;
  timeEstimate: string;
  policeVerified: boolean;
  avatar: string;
}

// ─── Review Types ─────────────────────────────────────────────────────────────
export interface ReviewInput {
  user_id: number;
  task_id: number;
  given_by: number;
  body: string;
  rating: number;
  attachment_id?: number | null;
}

export interface ReviewResponse {
  id: number;
  user_id: number;
  task_id: number;
  given_by: number;
  body: string;
  rating: number;
  attachment_id?: number | null;
  created_at?: string;
}

