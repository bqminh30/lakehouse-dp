# Ghi Chú Yêu Cầu & Kết Quả Thực Hiện Data Lakehouse

## 1. Yêu cầu ban đầu
- Xây dựng hệ sinh thái Data Lakehouse bao gồm:
  - Database PostgreSQL (OLTP nguồn)
  - MinIO (S3 Object Storage)
  - Apache Iceberg dùng REST Catalog
  - Apache Spark Standalone cluster (Master + Worker)
  - Trino (Distributed SQL Query Engine)
  - ClickHouse (OLAP Database Serving Layer)
  - Giao diện biểu đồ Chart (ReactJS + Apache ECharts - chạy độc lập trên host)
- Tất cả các dịch vụ trên chạy bằng Docker, trừ giao diện biểu đồ ReactJS.
- Toàn bộ thông tin tài khoản, mật khẩu, port cấu hình tập trung ở file `.env`.
- Sau khi code xong: build, run, test pipeline end-to-end dữ liệu, giải thích chi tiết cách thức hoạt động của từng module, Spark, Iceberg, Trino, lưu ý và lộ trình phát triển tiếp theo.

---

## 2. Những thứ đã thực hiện và hoàn thành (Deliverables)

### 2.1. Cấu hình Môi trường & Hạ tầng Docker
- Đã tạo file `.env` và `.env.example` chứa toàn bộ biến môi trường tập trung (tài khoản, mật khẩu, port của Postgres, MinIO, Iceberg REST, Spark, Trino, ClickHouse).
- Đã xây dựng `docker-compose.yml` gồm 7 dịch vụ chính:
  1. `postgres`: PostgreSQL 16 Alpine với kịch bản khởi tạo tự động bảng và dữ liệu mẫu bán lẻ (`docker/postgres/init.sql`).
  2. `minio`: Dịch vụ lưu trữ đối tượng chuẩn S3 (`chainguard/minio:latest`).
  3. `minio-init`: Container tự động tạo bucket `warehouse` và gán quyền truy cập khi MinIO khởi động (`docker/minio/Dockerfile`).
  4. `iceberg-rest`: Apache Iceberg REST Catalog (`tabulario/iceberg-rest:0.4.0`) quản lý toàn bộ metadata của bảng Lakehouse.
  5. `spark-master`: Spark 3.5.1 Standalone Master kèm đầy đủ các thư viện JAR tích hợp sẵn (`iceberg-spark-runtime-3.5_2.12-1.5.2.jar`, `iceberg-aws-bundle-1.5.2.jar`, `hadoop-aws-3.3.4.jar`, `aws-java-sdk-bundle-1.12.262.jar`, `postgresql-42.6.0.jar`) và cấu hình sẵn catalog `lakehouse` trong `spark-defaults.conf`.
  6. `spark-worker`: Spark Worker xử lý tính toán phân tán kết nối trực tiếp đến Spark Master.
  7. `trino`: Trino 444 được cấu hình sẵn 3 catalog:
     - `iceberg.properties`: Đọc trực tiếp bảng Iceberg qua REST Catalog trên MinIO.
     - `postgres.properties`: Kết nối PostgreSQL nguồn.
     - `clickhouse.properties`: Kết nối ClickHouse serving layer.
  8. `clickhouse`: ClickHouse server kèm kịch bản khởi tạo bảng phân tích OLAP (`docker/clickhouse/init-db.sql`).

### 2.2. Pipeline Dữ liệu End-to-End (Data Pipelines)
- `pipeline/etl_postgres_to_iceberg.py`:
  - **Trích xuất (Extract)**: Đọc 5 bảng giao dịch bán hàng từ PostgreSQL qua JDBC (`customers`, `categories`, `products`, `orders`, `order_items`).
  - **Tầng Bronze (Raw)**: Ghi trực tiếp nguyên vẹn vào Iceberg namespace `lakehouse.bronze`.
  - **Tầng Silver (Enriched)**: Làm sạch, join đơn hàng với khách hàng, sản phẩm, ngành hàng, tính toán doanh thu từng dòng sản phẩm, phân vùng theo tháng `order_month` (`lakehouse.silver.enriched_orders`).
  - **Tầng Gold (Aggregated)**: Tính toán 3 bảng tổng hợp kinh doanh:
    - `lakehouse.gold.daily_sales`: Doanh thu và số lượng đơn hàng theo ngày.
    - `lakehouse.gold.category_sales`: Doanh số theo danh mục và bộ phận.
    - `lakehouse.gold.customer_analytics`: Giá trị vòng đời khách hàng (LTV).
- `pipeline/export_iceberg_to_clickhouse.py`:
  - Đọc dữ liệu từ tầng Gold của Iceberg và đồng bộ vào ClickHouse qua HTTP REST API với định dạng `JSONEachRow`.
- `pipeline/test_end_to_end.py`:
  - Bộ kiểm thử tự động xác minh:
    1. Kiểm tra namespace và row count của các bảng Bronze, Silver, Gold trong Iceberg REST.
    2. Kiểm tra snapshot history và tính năng Time Travel của Iceberg.
    3. Kiểm tra dữ liệu được nạp vào ClickHouse.
    4. Kiểm tra các câu truy vấn phân tán và truy vấn liên vùng (Federated Query join giữa Iceberg và PostgreSQL) qua Trino.
- `pipeline/run_pipeline.py`:
  - Kịch bản tổng điều phối chạy liên tiếp 3 bước trên bằng 1 câu lệnh duy nhất.

### 2.3. Frontend Trực Quan Hóa (ReactJS + Apache ECharts)
- Thư mục `frontend/` được dựng sẵn bằng Vite + React 18 + TypeScript:
  - `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`.
  - Các component ECharts:
    - `RevenueTrendChart.tsx`: Biểu đồ kết hợp cột (Doanh thu) và đường (Số lượng đơn).
    - `CategoryPieChart.tsx`: Biểu đồ tròn/donut cơ cấu doanh số theo ngành hàng.
    - `CustomerTopChart.tsx`: Biểu đồ thanh ngang xếp hạng Top khách hàng chi tiêu nhiều nhất.
    - `MetricCards.tsx`: Thẻ KPI tổng quan (Tổng doanh thu, Tổng đơn hàng, Tỷ lệ hoàn thành, AOV).
  - Kết nối động: Tự động truy vấn ClickHouse (`http://localhost:8123`) hoặc kích hoạt chế độ mô phỏng dữ liệu thông minh khi cần.
  - File `.env` và `.env.example` riêng cho frontend.

### 2.4. Tài liệu chi tiết & Hướng dẫn chuyên sâu
- File `README.md` đã được biên soạn đầy đủ, chi tiết bao gồm:
  - Sơ đồ kiến trúc tổng thể.
  - Giải thích chi tiết nguyên lý hoạt động của từng module.
  - Chuyên sâu về cơ chế hoạt động của Apache Spark (Driver, Worker, Executor, Catalyst Optimizer, Tungsten, DAG, Shuffling).
  - Chuyên sâu về Apache Iceberg (Cây Metadata, Manifest list/files, ACID, Hidden Partitioning, Time Travel) và Trino (Distributed MPP, Federated Query).
  - Hướng dẫn khởi chạy và vận hành từng bước (Quickstart).
  - Những lưu ý quan trọng về vận hành Lakehouse (Small files, Compaction, Expire Snapshots, OOM).
  - Lộ trình phát triển tiếp theo (Airflow/Dagster, dbt, Debezium CDC, Great Expectations, Prometheus/Grafana).
