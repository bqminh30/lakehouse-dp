import { DailySalesRecord, CategorySalesRecord, CustomerAnalyticsRecord } from '../types';

const CH_URL = import.meta.env.VITE_CLICKHOUSE_URL || 'http://localhost:8123';
const CH_USER = import.meta.env.VITE_CLICKHOUSE_USER || 'default';
const CH_PASS = import.meta.env.VITE_CLICKHOUSE_PASSWORD || 'clickhouse123';
const CH_DB = import.meta.env.VITE_CLICKHOUSE_DB || 'analytics';

// Realistic fallback data generated from our PostgreSQL -> Iceberg pipeline
const FALLBACK_DAILY_SALES: DailySalesRecord[] = [
  { order_date: '2026-11-01', total_revenue: 1698.00, total_orders: 1, completed_orders: 1, avg_order_value: 1698.00 },
  { order_date: '2026-11-02', total_revenue: 1999.00, total_orders: 1, completed_orders: 1, avg_order_value: 1999.00 },
  { order_date: '2026-11-03', total_revenue: 579.00, total_orders: 1, completed_orders: 1, avg_order_value: 579.00 },
  { order_date: '2026-11-04', total_revenue: 1199.00, total_orders: 1, completed_orders: 0, avg_order_value: 1199.00 },
  { order_date: '2026-11-05', total_revenue: 699.00, total_orders: 1, completed_orders: 1, avg_order_value: 699.00 },
  { order_date: '2026-11-06', total_revenue: 249.00, total_orders: 1, completed_orders: 0, avg_order_value: 249.00 },
  { order_date: '2026-11-07', total_revenue: 1879.00, total_orders: 1, completed_orders: 1, avg_order_value: 1879.00 },
  { order_date: '2026-11-08', total_revenue: 370.00, total_orders: 1, completed_orders: 1, avg_order_value: 370.00 },
  { order_date: '2026-11-09', total_revenue: 1299.00, total_orders: 1, completed_orders: 1, avg_order_value: 1299.00 },
  { order_date: '2026-11-10', total_revenue: 699.00, total_orders: 1, completed_orders: 1, avg_order_value: 699.00 },
  { order_date: '2026-11-11', total_revenue: 499.00, total_orders: 1, completed_orders: 0, avg_order_value: 499.00 },
  { order_date: '2026-11-12', total_revenue: 370.00, total_orders: 1, completed_orders: 1, avg_order_value: 370.00 },
  { order_date: '2026-11-13', total_revenue: 1999.00, total_orders: 1, completed_orders: 1, avg_order_value: 1999.00 },
  { order_date: '2026-11-14', total_revenue: 1699.00, total_orders: 1, completed_orders: 1, avg_order_value: 1699.00 },
  { order_date: '2026-11-15', total_revenue: 1448.00, total_orders: 1, completed_orders: 1, avg_order_value: 1448.00 },
  { order_date: '2026-11-16', total_revenue: 879.00, total_orders: 1, completed_orders: 1, avg_order_value: 879.00 }
];

const FALLBACK_CATEGORY_SALES: CategorySalesRecord[] = [
  { category_name: 'Laptops', department: 'Electronics', total_revenue: 7396.00, total_units_sold: 4 },
  { category_name: 'Smartphones', department: 'Electronics', total_revenue: 5096.00, total_units_sold: 4 },
  { category_name: 'Audio', department: 'Electronics', total_revenue: 1695.00, total_units_sold: 5 },
  { category_name: 'Home Appliances', department: 'Living', total_revenue: 1398.00, total_units_sold: 2 },
  { category_name: 'Fashion Shoes', department: 'Apparel', total_revenue: 1100.00, total_units_sold: 6 },
  { category_name: 'Kitchen', department: 'Living', total_revenue: 998.00, total_units_sold: 2 }
];

const FALLBACK_CUSTOMERS: CustomerAnalyticsRecord[] = [
  { customer_id: 7, full_name: 'Dang Quoc Huy', city: 'Ho Chi Minh City', total_spent: 3427.00, order_count: 2, first_order_date: '2026-11-07', last_order_date: '2026-11-15' },
  { customer_id: 1, full_name: 'Nguyen Van An', city: 'Hanoi', total_spent: 2997.00, order_count: 2, first_order_date: '2026-11-01', last_order_date: '2026-11-09' },
  { customer_id: 5, full_name: 'Hoang Minh Duc', city: 'Hai Phong', total_spent: 2698.00, order_count: 2, first_order_date: '2026-11-05', last_order_date: '2026-11-13' },
  { customer_id: 2, full_name: 'Tran Thi Binh', city: 'Ho Chi Minh City', total_spent: 2698.00, order_count: 2, first_order_date: '2026-11-02', last_order_date: '2026-11-10' },
  { customer_id: 6, full_name: 'Vu Hong Hanh', city: 'Hanoi', total_spent: 1948.00, order_count: 2, first_order_date: '2026-11-06', last_order_date: '2026-11-14' },
  { customer_id: 4, full_name: 'Pham Thi Dung', city: 'Can Tho', total_spent: 1569.00, order_count: 2, first_order_date: '2026-11-04', last_order_date: '2026-11-12' },
  { customer_id: 8, full_name: 'Bui Mai Linh', city: 'Da Nang', total_spent: 1268.00, order_count: 2, first_order_date: '2026-11-08', last_order_date: '2026-11-16' },
  { customer_id: 3, full_name: 'Le Van Cuong', city: 'Da Nang', total_spent: 1078.00, order_count: 2, first_order_date: '2026-11-03', last_order_date: '2026-11-11' }
];

async function queryClickHouse<T>(query: string, fallback: T): Promise<{ data: T; isLive: boolean }> {
  try {
    const auth = btoa(`${CH_USER}:${CH_PASS}`);
    const url = `${CH_URL}/?database=${CH_DB}&query=${encodeURIComponent(query + ' FORMAT JSON')}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (res.ok) {
      const json = await res.json();
      return { data: json.data as T, isLive: true };
    }
  } catch {
    // Network or CORS error -> use fallback
  }

  return { data: fallback, isLive: false };
}

export async function getDailySales() {
  return queryClickHouse<DailySalesRecord[]>(
    'SELECT * FROM orders_summary_daily ORDER BY order_date ASC',
    FALLBACK_DAILY_SALES
  );
}

export async function getCategorySales() {
  return queryClickHouse<CategorySalesRecord[]>(
    'SELECT * FROM category_performance ORDER BY total_revenue DESC',
    FALLBACK_CATEGORY_SALES
  );
}

export async function getCustomerAnalytics() {
  return queryClickHouse<CustomerAnalyticsRecord[]>(
    'SELECT * FROM customer_analytics ORDER BY total_spent DESC',
    FALLBACK_CUSTOMERS
  );
}

