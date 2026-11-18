export interface DailySalesRecord {
  order_date: string;
  total_revenue: number;
  total_orders: number;
  completed_orders: number;
  avg_order_value: number;
}

export interface CategorySalesRecord {
  category_name: string;
  department: string;
  total_revenue: number;
  total_units_sold: number;
}

export interface CustomerAnalyticsRecord {
  customer_id: number;
  full_name: string;
  city: string;
  total_spent: number;
  order_count: number;
  first_order_date: string;
  last_order_date: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  topCategory: string;
  topCustomer: string;
}

