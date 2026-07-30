import { User, BackendTask, Category, PaymentPreference, Status, UserLocation } from './index';

export interface AdminUserItem {
  id: number;
  name: string;
  phone: string;
  email?: string;
  usertype_id: number;
  roleName: string;
  status: 'active' | 'suspended';
  profile_pic?: string;
  verified?: boolean;
  rating?: number;
  totalTasks?: number;
  joinedDate?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  location_id?: number;
}

export interface VerificationPayload {
  is_verified: boolean;
}

export interface ProDetails {
  profile: User;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  totalEarnings: number;
  completedTasksCount: number;
  assignedTasks: BackendTask[];
  reviews: any[];
  attachments: any[];
}

export interface AdminBidItem {
  id: number | string;
  task_id: number;
  worker_id: number;
  worker_name?: string;
  worker_avatar?: string;
  worker_rating?: number;
  amount: number;
  message?: string;
  created_at?: string;
  time_estimate?: string;
}

export interface AdminReviewItem {
  id: number;
  user_id: number;
  task_id: number;
  given_by: number;
  user_name?: string;
  given_by_name?: string;
  body: string;
  rating: number;
  attachment_id?: number | null;
  created_at?: string;
}

export interface AdminEarningItem {
  id?: number;
  worker_id: number;
  worker_name?: string;
  daily_earning: number;
  weekly_earning: number;
  total_earning: number;
  jobs_done: number;
  daily_jobs_done?: number;
  updated_at?: string;
}

export interface AdminAttachmentItem {
  id: number;
  task_id?: number;
  task?: number;
  file_url?: string;
  file?: string;
  url?: string;
  image?: string;
  attachment?: { file?: string; url?: string };
  file_name?: string;
  name?: string;
  uploaded_at?: string;
  created_at?: string;
  file_size?: number;
}

export interface CountryItem {
  id: number;
  name: string;
  code?: string;
}

export interface CityItem {
  id: number;
  name: string;
  country_id?: number;
  country_name?: string;
}

export interface AreaItem {
  id: number;
  name: string;
  city_id?: number;
  city_name?: string;
}

export interface LocationItem extends UserLocation {
  id: number;
  address_line?: string;
}

export interface UserTypeItem {
  id: number;
  name: string;
  description?: string;
}

export interface SystemConfigItem {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalPros: number;
  verifiedPros: number;
  totalTasks: number;
  openTasks: number;
  totalReviews: number;
  totalCategories: number;
  totalCountries: number;
  totalCities: number;
  totalAreas: number;
}
