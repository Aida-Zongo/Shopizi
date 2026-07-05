export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: 'merchant' | 'admin' | 'driver' | 'customer';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Shop {
  id: string;
  subdomain: string;
  name: string;
  description?: string;
  category: 'shop' | 'restaurant' | 'pharmacy' | 'artisan' | 'service' | 'other';
  whatsapp_number: string;
  city_id?: string;
  city_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string;
  banner_url?: string;
  is_published: boolean;
  allows_delivery: boolean;
  delivery_fee_xof?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_xof: number;
  stock_quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order' | 'discontinued';
  category_id?: string;
  is_featured: boolean;
  sort_order: number;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  thumbnail_url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  price_adjustment_xof: number;
  stock_quantity: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  product_count: number;
}

export interface Order {
  id: string;
  order_number: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address?: string;
  delivery_city_id?: string;
  delivery_fee_xof: number;
  status: string;
  source: string;
  total_amount_xof: number;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_xof: number;
  line_total_xof: number;
}

export interface Review {
  id: string;
  product_id: string;
  shop_id: string;
  user_id?: string;
  anonymous_name?: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  type: 'customer_merchant' | 'group_review' | 'support';
  product_id?: string;
  shop_id?: string;
  title?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  participant_count: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id?: string;
  sender_name?: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Delivery {
  id: string;
  order_id: string;
  shop_id: string;
  driver_id?: string;
  city_id?: string;
  pickup_address: string;
  delivery_address: string;
  delivery_fee_xof: number;
  status: string;
  tracking_code?: string;
  created_at: string;
}

export interface DeliveryDriver {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  city_name: string;
  vehicle_type: string;
  status: string;
  avg_rating: number;
  total_reviews: number;
  total_deliveries: number;
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
    statusCode: number;
    code?: string;
  };
}
