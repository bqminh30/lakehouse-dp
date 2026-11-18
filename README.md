# 🏛️ Modern Data Lakehouse Platform

Hệ thống Data Lakehouse kiến trúc hiện đại chuẩn doanh nghiệp kết hợp **PostgreSQL + MinIO (S3) + Apache Iceberg (REST Catalog) + Apache Spark 3.5 Standalone + Trino + ClickHouse + React & Apache ECharts**.

---

## 📌 Mục lục
1. [Kiến trúc tổng thể hệ thống (Architecture Overview)](#1-kiến-trúc-tổng-thể-hệ-thống)
2. [Chi tiết từng Module & Vai trò](#2-chi-tiết-từng-module--vai-trò)
3. [Chuyên sâu: Apache Spark hoạt động như thế nào?](#3-chuyên-sâu-apache-spark-hoạt-động-như-thế-nào)
4. [Chuyên sâu: Apache Iceberg & Trino hoạt động như thế nào?](#4-chuyên-sâu-apache-iceberg--trino-hoạt-động-như-thế-nào)
5. [ClickHouse trong vai trò Serving Layer](#5-clickhouse-trong-vai-trò-serving-layer)
6. [Hướng dẫn cài đặt & Chạy hệ thống từng bước](#6-hướng-dẫn-cài-đặt--chạy-hệ-thống-từng-bước)
7. [Chạy Frontend Dashboard (React + ECharts)](#7-chạy-frontend-dashboard-react--echarts)
8. [Những lưu ý sống còn cho người mới làm Lakehouse](#8-những-lưu-ý-sống-còn-cho-người-mới-làm-lakehouse)
9. [Lộ trình phát triển tiếp theo (Next Steps lên Production)](#9-lộ-trình-phát-triển-tiếp-theo-next-steps-lên-production)

---

## 1. Kiến trúc tổng thể hệ thống

Hệ thống được xây dựng theo mô hình **Medallion Architecture (Bronze → Silver → Gold)** với phân tách hoàn toàn giữa tính toán (**Compute**) và lưu trữ (**Storage**):

```
+-----------------------------------------------------------------------------------+
|                                 DATA PLATFORM ARCHITECTURE                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ PostgreSQL (OLTP) ]                                                            |
|       │                                                                           |
|       │ (JDBC Batch / CDC Extract)                                                |
|       ▼                                                                           |
|  [ Apache Spark 3.5 Cluster ] ──(Metadata Register)──► [ Iceberg REST Catalog ]   |
|       │                                                        │                  |
|       │ (Parquet Data Read / Write)                            │ (Table Metadata) |
|       ▼                                                        ▼                  |
|  [ MinIO S3 Object Storage ] ◄─────────────────────────────────┘                  |
|       │  - s3://warehouse/bronze (Raw Ingestion)                                  |
|       │  - s3://warehouse/silver (Enriched & Partitioned)                         |
|       │  - s3://warehouse/gold   (Business Aggregations)                          |
|       │                                                                           |
|       ├─────────────────────────────────┬─────────────────────────────────┐       |
|       ▼                                 ▼                                 ▼       |
|  [ Trino MPP Engine ]          [ ClickHouse OLAP ]              [ Direct Query ]  |
|   (Ad-hoc SQL & Cross-source)   (Sub-second Serving Layer)                        |
|       │                                 │                                         |
|       └────────────────► ◄──────────────┘                                         |
|                          │                                                        |
|                          ▼                                                        |
|             [ React + ECharts Dashboard ]                                         |
|               (Biểu đồ doanh thu, KPI)                                           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Chi tiết từng Module & Vai trò

| Module | Công nghệ & Phiên bản | Cổng (Port) | Vai trò trong hệ thống |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `postgres:16-alpine` | `5432` | **Nguồn dữ liệu giao dịch (OLTP)**: Lưu trữ đơn hàng, khách hàng, sản phẩm của hệ thống bán lẻ. |
| **MinIO** | `chainguard/minio:latest` | `9000` (API), `9001` (Web) | **Storage Layer (S3-compatible)**: Nơi lưu trữ vật lý các file Parquet chứa dữ liệu thực tế và các file metadata `.json` / `.avro` của Iceberg. |
| **Iceberg REST** | `tabulario/iceberg-rest:0.4.0` | `8181` | **Central Metadata Catalog**: Quản lý schema, snapshot, metadata của bảng Iceberg theo chuẩn REST mở. Spark và Trino đều kết nối vào đây. |
| **Spark Master** | `lakehouse-spark:3.5.1` | `7077` (RPC), `8082` (Web UI) | **Điều phối tính toán phân tán (Cluster Master)**: Quản lý worker, lập lịch và phân bổ tài nguyên cho các job tính toán. |
| **Spark Worker** | `lakehouse-spark:3.5.1` | `8083` (Web UI) | **Thực thi tính toán (Executor Runner)**: Chạy các task xử lý dữ liệu thực tế (ETL Bronze → Silver → Gold). |
| **Trino** | `trinodb/trino:444` | `8080` (Web UI & JDBC) | **Động cơ truy vấn SQL phân tán (MPP Query Engine)**: Cho phép chạy SQL trực tiếp lên bảng Iceberg với tốc độ cao, hỗ trợ join chéo nguồn (Federated Query giữa Iceberg, Postgres, ClickHouse). |
| **ClickHouse** | `clickhouse-server:latest` | `8123` (HTTP), `9002` (Native) | **Serving Layer (OLAP)**: Lưu trữ các bảng Gold đã tổng hợp để phục vụ dashboard và API với độ trễ tính bằng mili-giây. |
| **Frontend** | React 18 + Vite + ECharts | `3000` | **Giao diện trực quan hóa**: Biểu đồ doanh thu hàng ngày, tỷ trọng ngành hàng, top khách hàng LTV (chạy trên máy host). |

---

## 3. Chuyên sâu: Apache Spark hoạt động như thế nào?

Nếu bạn là người mới tiếp cận Spark, đây là các nguyên lý cốt lõi cần nắm vững:

### 3.1. Kiến trúc phân tán (Distributed Architecture)
Spark hoạt động theo mô hình **Master - Worker**:
1. **Driver Program**: Chương trình Python/Java bạn viết (chứa `SparkSession`). Nó phân tích code, tạo ra kế hoạch thực thi (Logical Plan), chia thành các Job, Stage, Task và gửi đến Cluster.
2. **Cluster Manager** (trong bài này là **Spark Standalone**): Quản lý tài nguyên phần cứng (CPU cores, RAM) của cụm máy.
3. **Worker Node & Executor**: Worker là tiến trình chạy trên từng máy. Trên mỗi worker, Master sẽ cấp phát các **Executor** (tiến trình JVM độc lập) để chạy các task song song trên các phân vùng dữ liệu (**Partitions**).

### 3.2. Cơ chế thực thi: Catalyst Optimizer & Tungsten
Khi bạn viết lệnh Spark SQL hoặc DataFrame API:
- **Unresolved Logical Plan**: Spark kiểm tra cú pháp tên bảng, tên cột xem có tồn tại trong Iceberg Catalog hay không.
- **Resolved Logical Plan**: Ghép schema từ Catalog vào bảng.
- **Optimized Logical Plan**: Bộ tối ưu hóa **Catalyst** áp dụng các luật tối ưu:
  - *Predicate Pushdown*: Đẩy mệnh đề `WHERE order_date >= '2026-11-01'` xuống tận tầng lưu trữ Iceberg để chỉ đọc đúng file Parquet cần thiết, không đọc thừa.
  - *Projection Pushdown*: Chỉ đọc các cột có trong `SELECT`, bỏ qua các cột khác trong file Parquet dạng cột (Columnar format).
- **Physical Plan & Code Generation (Tungsten)**: Sinh mã bytecode Java trực tiếp chạy trên CPU để đạt tốc độ xử lý trong bộ nhớ (In-memory) cao nhất.

### 3.3. Directed Acyclic Graph (DAG) & Shuffling
- **Transformation (Lazy Evaluation)**: Các phép biến đổi như `select()`, `filter()`, `join()`, `groupBy()` không chạy ngay lập tức mà chỉ xây dựng một đồ thị luồng xử lý (**DAG**).
- **Action**: Chỉ khi gọi Action như `.count()`, `.show()`, `.writeTo()`, Spark mới kích hoạt DAG và bắt đầu tính toán thực tế.
- **Narrow Transformation**: Dữ liệu ở partition này chỉ phụ thuộc vào 1 partition trước đó (như `filter`, `map`), chạy cực nhanh không cần chuyển dữ liệu qua mạng.
- **Wide Transformation & Shuffle**: Các phép `groupBy`, `join` yêu cầu gom dữ liệu cùng key từ nhiều máy về một máy. Quá trình này gọi là **Shuffle** (tốn CPU, I/O đĩa và băng thông mạng nhất trong Spark).

### 3.4. Spark tương tác với Apache Iceberg như thế nào?
Nhờ cấu hình `spark.sql.catalog.lakehouse`:
- Spark giao tiếp với **Iceberg REST Catalog** qua HTTP để lấy thông tin vị trí các file Parquet cần đọc/ghi.
- Khi ghi dữ liệu (`df.writeTo("lakehouse.silver.enriched_orders").createOrReplace()`):
  1. Các Spark Executor ghi trực tiếp các file Parquet dữ liệu mới vào bucket `s3://warehouse/` trên MinIO.
  2. Mỗi Executor trả về danh sách file đã ghi cho Driver.
  3. Spark Driver gửi commit ACID atomic duy nhất lên Iceberg REST Catalog để cập nhật snapshot mới. Nếu có lỗi giữa chừng, không có dữ liệu rác nào bị lộ ra ngoài.

---

## 4. Chuyên sâu: Apache Iceberg & Trino hoạt động như thế nào?

### 4.1. Tại sao cần Apache Iceberg thay vì lưu file Parquet thông thường?
Lưu file trên S3/HDFS thông thường gặp các vấn đề nghiêm trọng:
- Không có giao dịch ACID: Nếu tiến trình ghi bị crash giữa chừng, thư mục bị dính file lỗi/dữ liệu rác.
- Đọc không nhất quán (Dirty Reads): Người đọc có thể đọc trúng dữ liệu đang được ghi dở.
- Schema Evolution nguy hiểm: Xóa/đổi tên cột trong Parquet cũ sẽ làm hỏng truy vấn.
- Thư mục phân vùng quá nhiều làm chậm việc list file trên S3 (S3 ListObjects rất chậm và tốn chi phí).

### 4.2. Cấu trúc cây Metadata của Iceberg (Metadata Tree)
Iceberg giải quyết bài toán trên bằng cấu trúc phân cấp:
```
[ Catalog (Iceberg REST) ] -> Trỏ tới file metadata hiện tại: v1.metadata.json
        │
        ▼
[ Snapshot ] (Ảnh chụp trạng thái bảng tại thời điểm commit)
        │
        ▼
[ Manifest List ] (Danh sách các file manifest kèm thống kê min/max)
        │
        ▼
[ Manifest File ] (Danh sách các file data Parquet thực tế)
        │
        ▼
[ Data Files ] (file-1.parquet, file-2.parquet lưu trên MinIO)
```

- **Time Travel**: Mọi snapshot đều được lưu lại lịch sử. Bạn có thể truy vấn bảng tại một thời điểm trong quá khứ: `SELECT * FROM table FOR SYSTEM_TIME AS OF 'timestamp'` hoặc `FOR SYSTEM_VERSION AS OF <snapshot_id>`.
- **Hidden Partitioning**: Người dùng chỉ cần query `WHERE order_date = '2026-11-05'`, Iceberg tự động ánh xạ vào partition `order_month` mà không bắt người dùng phải nhớ cấu trúc thư mục.

### 4.3. Động cơ truy vấn Trino (Distributed MPP SQL Engine)
- **Coordinator**: Tiếp nhận câu lệnh SQL từ người dùng, biên dịch thành đồ thị phân tán, phân chia công việc thành các **Splits** và giao cho các Worker.
- **Workers**: Thực thi đọc dữ liệu dạng vector hóa (vectorized processing) trên bộ nhớ RAM.
- **Federated Queries (Truy vấn liên vùng)**: Trino có thể kết nối nhiều Catalog cùng lúc. Bạn có thể viết 1 câu SQL duy nhất join dữ liệu từ Iceberg (MinIO) với PostgreSQL và ClickHouse mà không cần di chuyển dữ liệu thủ công!

---

## 5. ClickHouse trong vai trò Serving Layer

Tại sao đã có Iceberg và Trino rồi mà vẫn cần **ClickHouse**?
- **Trino**: Tối ưu cho truy vấn ad-hoc, dữ liệu lớn quy mô Petabyte, quét nhiều bảng lớn. Tuy nhiên độ trễ thường từ vài trăm mili-giây đến vài giây (không thích hợp cho dashboard có hàng nghìn người cùng xem đồng thời).
- **ClickHouse**: Là cơ sở dữ liệu OLAP dạng cột được tối ưu hóa cực hạn về tốc độ đọc tổng hợp (Aggregations). Tốc độ trả lời câu hỏi của dashboard chỉ từ **5ms - 50ms**, chịu tải hàng nghìn truy vấn đồng thời (concurrency cao).
- **Mô hình chuẩn**: Spark biến đổi dữ liệu lớn trong Lakehouse (Iceberg) → Định kỳ xuất bảng Gold đã tổng hợp sang ClickHouse → Dashboard React ECharts kết nối vào ClickHouse để người dùng lướt biểu đồ siêu mượt!

---

## 6. Hướng dẫn cài đặt & Chạy hệ thống từng bước

### Bước 1: Kiểm tra file cấu hình môi trường `.env`
Các thông tin cấu hình tài khoản, mật khẩu, cổng kết nối đều được quản lý tập trung trong file `.env`:
```env
# MinIO S3
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password123
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=warehouse

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=lakehouse_source
POSTGRES_PORT=5432

# Iceberg REST
ICEBERG_REST_PORT=8181
ICEBERG_WAREHOUSE=s3://warehouse/

# Spark Standalone
SPARK_MASTER_PORT=7077
SPARK_MASTER_WEBUI_PORT=8082
SPARK_WORKER_WEBUI_PORT=8083

# Trino & ClickHouse
TRINO_PORT=8080
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=clickhouse123
CLICKHOUSE_DB=analytics
CLICKHOUSE_HTTP_PORT=8123
CLICKHOUSE_NATIVE_PORT=9002
```

### Bước 2: Khởi động toàn bộ cụm Lakehouse bằng Docker Compose
Mở terminal tại thư mục gốc của project:
```bash
docker compose up -d
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```
Tất cả các dịch vụ (`clickhouse`, `postgres`, `minio`, `iceberg-rest`, `spark-master`, `spark-worker`, `trino`) sẽ ở trạng thái `Up` hoặc `healthy`.

### Bước 3: Chạy Pipeline ETL End-to-End
Chạy toàn bộ pipeline ETL đọc PostgreSQL → Ghi Iceberg (Bronze/Silver/Gold) → Đồng bộ ClickHouse → Chạy kiểm thử tự động:
```bash
docker exec -e AWS_REGION=us-east-1 lakehouse-spark-master /opt/spark/bin/spark-submit /opt/spark/pipeline/run_pipeline.py
```

Hoặc bạn có thể chạy từng bước riêng biệt:
1. **ETL Postgres sang Iceberg**:
   ```bash
   docker exec -e AWS_REGION=us-east-1 lakehouse-spark-master /opt/spark/bin/spark-submit /opt/spark/pipeline/etl_postgres_to_iceberg.py
   ```
2. **Đồng bộ Gold sang ClickHouse**:
   ```bash
   docker exec -e AWS_REGION=us-east-1 lakehouse-spark-master /opt/spark/bin/spark-submit /opt/spark/pipeline/export_iceberg_to_clickhouse.py
   ```
3. **Chạy bộ Test kiểm thử chất lượng**:
   ```bash
   docker exec -e AWS_REGION=us-east-1 lakehouse-spark-master /opt/spark/bin/spark-submit /opt/spark/pipeline/test_end_to_end.py
   ```

### Bước 4: Truy cập các Web UI để quan sát hệ thống
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `admin` / Password: `password123`)
  - Vào xem bucket `warehouse` sẽ thấy thư mục `bronze`, `silver`, `gold` chứa dữ liệu Parquet và file metadata của Iceberg.
- **Spark Master UI**: [http://localhost:8082](http://localhost:8082)
  - Xem danh sách Worker, tài nguyên CPU/RAM, các ứng dụng Spark đã chạy thành công.
- **Trino Web UI**: [http://localhost:8080](http://localhost:8080) (User: `admin`)
  - Theo dõi các truy vấn SQL phân tán đang chạy.
- **ClickHouse HTTP**: [http://localhost:8123/ping](http://localhost:8123/ping) (Trả về `Ok.`)

---

## 7. Chạy Frontend Dashboard (React + ECharts)

Giao diện trực quan hóa được tách riêng trong thư mục `frontend/` để bạn tự do chạy và phát triển thêm.

### Cài đặt và khởi chạy:
```bash
cd frontend
npm install
npm run dev
```
Trình duyệt sẽ tự động mở trang web tại: **http://localhost:3000**

### Tính năng của Dashboard:
- **Thẻ chỉ số KPI (Metric Cards)**: Tổng doanh thu Lakehouse, tổng số đơn hàng, tỷ lệ hoàn thành, giá trị trung bình đơn hàng (AOV).
- **Biểu đồ cột kết hợp đường (Combo Chart)**: Xu hướng doanh thu theo ngày và số lượng đơn hàng.
- **Biểu đồ tròn (Donut Chart)**: Cơ cấu tỷ trọng doanh thu theo ngành hàng (Electronics, Living, Apparel).
- **Biểu đồ thanh ngang (Horizontal Bar Chart)**: Top khách hàng chi tiêu nhiều nhất theo giá trị vòng đời (LTV).
- **Cơ chế Dual-mode**: Tự động kết nối trực tiếp vào ClickHouse (`http://localhost:8123`). Nếu ClickHouse chưa bật hoặc có lỗi mạng, dashboard sẽ tự động chuyển sang chế độ dữ liệu mẫu mô phỏng để giao diện không bao giờ bị lỗi.

---

## 8. Những lưu ý sống còn cho người mới làm Lakehouse

1. **Quản lý kích thước file (Small Files Problem)**:
   - Khi ghi dữ liệu thường xuyên (ví dụ ghi theo phút), Iceberg sẽ tạo ra rất nhiều file Parquet nhỏ (vài KB đến vài MB). Điều này làm chậm tốc độ query của Trino/Spark.
   - *Giải pháp*: Định kỳ chạy lệnh Compaction của Iceberg:
     ```sql
     CALL lakehouse.system.rewrite_data_files(table => 'silver.enriched_orders');
     ```
2. **Dọn dẹp lịch sử Snapshot (Orphan files & Snapshot expiration)**:
   - Mỗi commit tạo ra 1 snapshot mới. Nếu không dọn dẹp, dung lượng MinIO sẽ tăng liên tục dù bạn có xóa dữ liệu.
   - *Giải pháp*: Thiết lập dọn snapshot cũ sau 7 ngày:
     ```sql
     CALL lakehouse.system.expire_snapshots(table => 'silver.enriched_orders', older_than => TIMESTAMP '2026-11-10 00:00:00');
     ```
3. **Phân vùng dữ liệu (Partitioning strategy)**:
   - Không phân vùng theo cột có độ phân tán quá cao (ví dụ: `customer_id` hay `order_id`).
   - Nên phân vùng theo thời gian ở mức vừa phải (tháng `month(order_date)` hoặc ngày `day(order_date)`).
4. **Cấu hình bộ nhớ JVM (Out of Memory - OOM)**:
   - Trino và Spark chạy trên nền Java JVM. Luôn giới hạn dung lượng RAM trong Docker Compose để tránh tình trạng tràn bộ nhớ làm treo hệ điều hành.

---

## 9. Lộ trình phát triển tiếp theo (Next Steps lên Production)

Khi bạn muốn đưa hệ sinh thái này lên môi trường thực tế, đây là các bước nâng cấp tiếp theo:

1. **Điều phối tự động (Data Orchestration)**:
   - Cài đặt **Apache Airflow** hoặc **Dagster** để lên lịch chạy job Spark tự động hàng giờ hoặc hàng ngày thay vì chạy thủ công bằng tay.
2. **Data Transformation as Code (dbt)**:
   - Dùng **dbt-trino** hoặc **dbt-spark** để viết các câu lệnh biến đổi Silver/Gold bằng mô hình SQL có kiểm thử (tests) và tài liệu hóa (lineage docs).
3. **Đồng bộ thời gian thực (CDC - Change Data Capture)**:
   - Dùng **Debezium + Apache Kafka** để bắt sự kiện thêm/sửa/xóa từ PostgreSQL và truyền trực tiếp vào Iceberg thông qua Spark Streaming hoặc Flink Streaming.
4. **Kiểm soát chất lượng dữ liệu (Data Quality)**:
   - Thêm bộ kiểm tra bằng **Great Expectations** hoặc **Soda Core** trước khi đẩy dữ liệu từ Silver lên Gold (kiểm tra null, khoảng giá trị, duplicate).
5. **Giám sát & Cảnh báo (Observability)**:
   - Cài đặt cụm **Prometheus + Grafana** để giám sát CPU, RAM, dung lượng MinIO và thời gian thực thi của từng job Spark / query Trino.

