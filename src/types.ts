export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Citizen' | 'Officer' | 'Administrator';
  phone?: string;
  department?: string;
  avatar?: string;
  is_active?: number; // 1 = Active, 0 = Inactive
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export type ComplaintCategory = 'Road' | 'Water' | 'Electricity' | 'Sanitation' | 'Waste' | 'Traffic' | 'Health' | 'Other';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ComplaintStatus = 'Submitted' | 'Verified' | 'Assigned' | 'Under Review' | 'In Progress' | 'Resolved' | 'Closed';
export interface ComplaintTracking {
  id: number;
  complaint_id: number;
  status: string;
  officer_name: string | null;
  remarks: string | null;
  created_at: string;
}

export interface Complaint {
  id: number;
  tracking_id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  image_url?: string;
  status: ComplaintStatus;
  citizen_id: number;
  officer_id?: number;
  resolution_notes?: string;
  resolution_image?: string;
  admin_feedback?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;

  // Joined fields from API
  citizen_name?: string;
  citizen_email?: string;
  citizen_phone?: string;
  officer_name?: string;
  officer_email?: string;
  officer_phone?: string;
  officer_department?: string;
  trackingHistory?: ComplaintTracking[];
}

export interface Department {
  id: number;
  name: string;
  head: string;
  active: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  active: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  submitted: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface CategoryData {
  category: string;
  count: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface OfficerPerformanceData {
  name: string;
  department: string;
  assigned: number;
  resolved: number;
  rate: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  title: string;
  category: string;
  status: string;
  priority: string;
  tracking_id: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  categoryDistribution: CategoryData[];
  monthlyDistribution: MonthlyData[];
  officerPerformance: OfficerPerformanceData[];
  heatmap: HeatmapPoint[];
  usersCount: {
    citizens: number;
    officers: number;
    admins: number;
  };
}

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}
