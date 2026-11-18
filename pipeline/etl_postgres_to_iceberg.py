"""
ETL Pipeline: PostgreSQL (OLTP) -> Apache Iceberg (Bronze -> Silver -> Gold)
Powered by Apache Spark & Apache Iceberg REST Catalog
"""

import sys
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def create_spark_session():
    """Initializes Spark Session with Iceberg REST catalog configurations."""
    return SparkSession.builder \
        .appName("Lakehouse_ETL_Postgres_to_Iceberg") \
        .getOrCreate()

def main():
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    print("\n" + "="*80)
    print("🚀 [START] Lakehouse ETL: Ingesting Postgres data into Apache Iceberg")
    print("="*80)

    # --------------------------------------------------------------------------
    # 1. EXTRACT: Read from PostgreSQL (Source DB)
    # --------------------------------------------------------------------------
    pg_url = "jdbc:postgresql://postgres:5432/lakehouse_source"
    pg_properties = {
        "user": "postgres",
        "password": "postgres",
        "driver": "org.postgresql.Driver"
    }

    print("\n📦 [1/4] Extracting tables from PostgreSQL...")
    customers_df = spark.read.jdbc(pg_url, "customers", properties=pg_properties)
    categories_df = spark.read.jdbc(pg_url, "categories", properties=pg_properties)
    products_df = spark.read.jdbc(pg_url, "products", properties=pg_properties)
    orders_df = spark.read.jdbc(pg_url, "orders", properties=pg_properties)
    order_items_df = spark.read.jdbc(pg_url, "order_items", properties=pg_properties)

    print(f"  - Extracted customers: {customers_df.count()} rows")
    print(f"  - Extracted categories: {categories_df.count()} rows")
    print(f"  - Extracted products: {products_df.count()} rows")
    print(f"  - Extracted orders: {orders_df.count()} rows")
    print(f"  - Extracted order items: {order_items_df.count()} rows")

    # --------------------------------------------------------------------------
    # 2. BRONZE LAYER: Raw Ingestion into Iceberg
    # --------------------------------------------------------------------------
    print("\n🥉 [2/4] Writing Bronze Layer (Raw Ingestion) to Iceberg...")
    spark.sql("CREATE NAMESPACE IF NOT EXISTS lakehouse.bronze")

    # Ingest raw copies
    orders_df.writeTo("lakehouse.bronze.orders").createOrReplace()
    customers_df.writeTo("lakehouse.bronze.customers").createOrReplace()
    products_df.writeTo("lakehouse.bronze.products").createOrReplace()
    order_items_df.writeTo("lakehouse.bronze.order_items").createOrReplace()
    categories_df.writeTo("lakehouse.bronze.categories").createOrReplace()
    print("  ✅ Bronze tables successfully written to MinIO via Iceberg REST Catalog.")

    # --------------------------------------------------------------------------
    # 3. SILVER LAYER: Clean, Enrich & Partition
    # --------------------------------------------------------------------------
    print("\n🥈 [3/4] Transforming and Writing Silver Layer (Enriched Data)...")
    spark.sql("CREATE NAMESPACE IF NOT EXISTS lakehouse.silver")

    # Join orders + customers + order_items + products + categories
    enriched_df = order_items_df.alias("oi") \
        .join(orders_df.alias("o"), F.col("oi.order_id") == F.col("o.order_id"), "inner") \
        .join(customers_df.alias("c"), F.col("o.customer_id") == F.col("c.customer_id"), "left") \
        .join(products_df.alias("p"), F.col("oi.product_id") == F.col("p.product_id"), "left") \
        .join(categories_df.alias("cat"), F.col("p.category_id") == F.col("cat.category_id"), "left") \
        .select(
            F.col("o.order_id").alias("order_id"),
            F.col("o.order_date").alias("order_date"),
            F.col("o.status").alias("order_status"),
            F.col("c.customer_id").alias("customer_id"),
            F.col("c.full_name").alias("customer_name"),
            F.col("c.city").alias("customer_city"),
            F.col("p.product_id").alias("product_id"),
            F.col("p.product_name").alias("product_name"),
            F.col("cat.category_name").alias("category_name"),
            F.col("cat.department").alias("department"),
            F.col("oi.quantity").alias("quantity"),
            F.col("oi.unit_price").alias("unit_price"),
            (F.col("oi.quantity") * F.col("oi.unit_price")).cast("double").alias("item_revenue"),
            F.date_trunc("month", F.col("o.order_date")).cast("date").alias("order_month")
        )

    # Write partitioned Silver table
    enriched_df.writeTo("lakehouse.silver.enriched_orders") \
        .partitionedBy("order_month") \
        .createOrReplace()

    silver_count = spark.table("lakehouse.silver.enriched_orders").count()
    print(f"  ✅ Silver table 'lakehouse.silver.enriched_orders' written ({silver_count} rows).")

    # --------------------------------------------------------------------------
    # 4. GOLD LAYER: Aggregated Business Metrics
    # --------------------------------------------------------------------------
    print("\n🥇 [4/4] Aggregating and Writing Gold Layer (Business Analytics)...")
    spark.sql("CREATE NAMESPACE IF NOT EXISTS lakehouse.gold")

    # Table 1: Daily Revenue Metrics
    gold_daily = spark.table("lakehouse.silver.enriched_orders") \
        .groupBy("order_date") \
        .agg(
            F.round(F.sum("item_revenue"), 2).alias("total_revenue"),
            F.countDistinct("order_id").alias("total_orders"),
            F.countDistinct(F.when(F.col("order_status") == "COMPLETED", F.col("order_id"))).alias("completed_orders"),
            F.round(F.sum("item_revenue") / F.countDistinct("order_id"), 2).alias("avg_order_value")
        ) \
        .orderBy("order_date")

    gold_daily.writeTo("lakehouse.gold.daily_sales").createOrReplace()
    print("  ✅ Gold table 'lakehouse.gold.daily_sales' created:")
    spark.table("lakehouse.gold.daily_sales").show(5, truncate=False)

    # Table 2: Category & Department Performance
    gold_category = spark.table("lakehouse.silver.enriched_orders") \
        .groupBy("department", "category_name") \
        .agg(
            F.round(F.sum("item_revenue"), 2).alias("total_revenue"),
            F.sum("quantity").alias("total_units_sold")
        ) \
        .orderBy(F.col("total_revenue").desc())

    gold_category.writeTo("lakehouse.gold.category_sales").createOrReplace()
    print("  ✅ Gold table 'lakehouse.gold.category_sales' created:")
    spark.table("lakehouse.gold.category_sales").show(10, truncate=False)

    # Table 3: Customer Lifetime Value (LTV)
    gold_customer = spark.table("lakehouse.silver.enriched_orders") \
        .groupBy("customer_id", "customer_name", "customer_city") \
        .agg(
            F.round(F.sum("item_revenue"), 2).alias("total_spent"),
            F.countDistinct("order_id").alias("order_count"),
            F.min("order_date").alias("first_order_date"),
            F.max("order_date").alias("last_order_date")
        ) \
        .orderBy(F.col("total_spent").desc())

    gold_customer.writeTo("lakehouse.gold.customer_analytics").createOrReplace()
    print("  ✅ Gold table 'lakehouse.gold.customer_analytics' created:")
    spark.table("lakehouse.gold.customer_analytics").show(10, truncate=False)

    print("\n" + "="*80)
    print("🎉 [FINISH] Lakehouse ETL executed successfully!")
    print("="*80)

    spark.stop()

if __name__ == "__main__":
    main()

