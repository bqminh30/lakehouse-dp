-- ==============================================================================
-- ClickHouse OLAP Initialization for Serving Lakehouse Analytics
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS analytics;

USE analytics;

-- Daily aggregated revenue table
CREATE TABLE IF NOT EXISTS analytics.orders_summary_daily (
    order_date Date,
    total_revenue Float64,
    total_orders UInt32,
    completed_orders UInt32,
    avg_order_value Float64
) ENGINE = ReplacingMergeTree()
ORDER BY order_date;

-- Category performance metrics
CREATE TABLE IF NOT EXISTS analytics.category_performance (
    category_name String,
    department String,
    total_revenue Float64,
    total_units_sold UInt32
) ENGINE = ReplacingMergeTree()
ORDER BY (department, category_name);

-- Customer high-level metrics
CREATE TABLE IF NOT EXISTS analytics.customer_analytics (
    customer_id UInt32,
    full_name String,
    city String,
    total_spent Float64,
    order_count UInt32,
    first_order_date Date,
    last_order_date Date
) ENGINE = ReplacingMergeTree()
ORDER BY customer_id;

