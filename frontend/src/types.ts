// Type definitions for frontend-api contract
// Note: backend returns 'id' for user, not 'user_id'

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: 'merchant' | 'driver' | 'admin' | 'customer';
  is_active?: boolean;
  email_verified?: boolean;
  shop_id?: string;
  avatar_url?: string;
  driver_id?: string;
  driver_status?: string;
  driver_rating?: number;
  driver_total_deliveries?: number;
  driver_balance?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    message: string;
    statusCode?: number;
    code?: string;
  };
}
