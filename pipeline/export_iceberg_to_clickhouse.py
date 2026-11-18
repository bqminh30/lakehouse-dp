"""
Export Pipeline: Apache Iceberg (Gold Layer) -> ClickHouse (OLAP Serving)
Uses ClickHouse Native HTTP REST API via requests
"""

import json
import requests
from pyspark.sql import SparkSession

CH_URL = "http://clickhouse:8123"
CH_AUTH = ("default", "clickhouse123")

def post_clickhouse_query(query, body=None):
    params = {"database": "analytics"}
    if query:
        params["query"] = query
    resp = requests.post(CH_URL, auth=CH_AUTH, params=params, data=body, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"ClickHouse HTTP Error {resp.status_code}: {resp.text}")
    return resp.text

def main():
    print("\n" + "="*80)
    print("🚀 [START] Exporting Iceberg Gold Metrics to ClickHouse via HTTP API")
    print("="*80)

    spark = SparkSession.builder \
        .appName("Iceberg_to_ClickHouse_Exporter") \
        .getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    # 1. Sync daily sales
    print("\n📊 [1/3] Syncing 'lakehouse.gold.daily_sales' -> 'analytics.orders_summary_daily'...")
    daily_rows = spark.table("lakehouse.gold.daily_sales").collect()
    daily_json = []
    for r in daily_rows:
        daily_json.append(json.dumps({
            "order_date": str(r["order_date"]),
            "total_revenue": float(r["total_revenue"]),
            "total_orders": int(r["total_orders"]),
            "completed_orders": int(r["completed_orders"]),
            "avg_order_value": float(r["avg_order_value"])
        }))
    if daily_json:
        payload = "\n".join(daily_json)
        post_clickhouse_query("INSERT INTO orders_summary_daily FORMAT JSONEachRow", body=payload)
    print(f"  ✅ Inserted {len(daily_json)} daily summary records into ClickHouse.")

    # 2. Sync category sales
    print("\n📊 [2/3] Syncing 'lakehouse.gold.category_sales' -> 'analytics.category_performance'...")
    cat_rows = spark.table("lakehouse.gold.category_sales").collect()
    cat_json = []
    for r in cat_rows:
        cat_json.append(json.dumps({
            "category_name": str(r["category_name"]),
            "department": str(r["department"]),
            "total_revenue": float(r["total_revenue"]),
            "total_units_sold": int(r["total_units_sold"])
        }))
    if cat_json:
        payload = "\n".join(cat_json)
        post_clickhouse_query("INSERT INTO category_performance FORMAT JSONEachRow", body=payload)
    print(f"  ✅ Inserted {len(cat_json)} category performance records into ClickHouse.")

    # 3. Sync customer analytics
    print("\n📊 [3/3] Syncing 'lakehouse.gold.customer_analytics' -> 'analytics.customer_analytics'...")
    cust_rows = spark.table("lakehouse.gold.customer_analytics").collect()
    cust_json = []
    for r in cust_rows:
        cust_json.append(json.dumps({
            "customer_id": int(r["customer_id"]),
            "full_name": str(r["customer_name"]),
            "city": str(r["customer_city"]),
            "total_spent": float(r["total_spent"]),
            "order_count": int(r["order_count"]),
            "first_order_date": str(r["first_order_date"]),
            "last_order_date": str(r["last_order_date"])
        }))
    if cust_json:
        payload = "\n".join(cust_json)
        post_clickhouse_query("INSERT INTO customer_analytics FORMAT JSONEachRow", body=payload)
    print(f"  ✅ Inserted {len(cust_json)} customer records into ClickHouse.")

    print("\n" + "="*80)
    print("🎉 [FINISH] Gold layer successfully exported to ClickHouse for fast dashboard serving!")
    print("="*80)

    spark.stop()

if __name__ == "__main__":
    main()
