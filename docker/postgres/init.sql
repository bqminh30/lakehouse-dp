-- ==============================================================================
-- Sample OLTP Retail Database Initialization for Lakehouse Demo
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Vietnam',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category_id INT REFERENCES categories(category_id),
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- COMPLETED, PENDING, CANCELLED, PROCESSING
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Seed Categories
INSERT INTO categories (category_name, department) VALUES
('Smartphones', 'Electronics'),
('Laptops', 'Electronics'),
('Audio', 'Electronics'),
('Home Appliances', 'Living'),
('Kitchen', 'Living'),
('Fashion Shoes', 'Apparel')
ON CONFLICT DO NOTHING;

-- Seed Products
INSERT INTO products (product_name, category_id, price) VALUES
('iPhone 15 Pro Max', 1, 1299.00),
('Samsung Galaxy S24 Ultra', 1, 1199.00),
('MacBook Pro M3 14-inch', 2, 1999.00),
('Dell XPS 15', 2, 1699.00),
('Sony WH-1000XM5 Headphones', 3, 399.00),
('AirPods Pro Gen 2', 3, 249.00),
('Dyson V12 Vacuum', 4, 699.00),
('DeLonghi Espresso Machine', 5, 499.00),
('Nike Air Jordan 1', 6, 180.00),
('Adidas Ultraboost Light', 6, 190.00)
ON CONFLICT DO NOTHING;

-- Seed Customers
INSERT INTO customers (full_name, email, city) VALUES
('Nguyen Van An', 'an.nguyen@example.com', 'Hanoi'),
('Tran Thi Binh', 'binh.tran@example.com', 'Ho Chi Minh City'),
('Le Van Cuong', 'cuong.le@example.com', 'Da Nang'),
('Pham Thi Dung', 'dung.pham@example.com', 'Can Tho'),
('Hoang Minh Duc', 'duc.hoang@example.com', 'Hai Phong'),
('Vu Hong Hanh', 'hanh.vu@example.com', 'Hanoi'),
('Dang Quoc Huy', 'huy.dang@example.com', 'Ho Chi Minh City'),
('Bui Mai Linh', 'linh.bui@example.com', 'Da Nang')
ON CONFLICT DO NOTHING;

-- Seed Orders
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES
(1, '2026-11-01', 'COMPLETED', 1698.00),
(2, '2026-11-02', 'COMPLETED', 1999.00),
(3, '2026-11-03', 'COMPLETED', 579.00),
(4, '2026-11-04', 'CANCELLED', 1199.00),
(5, '2026-11-05', 'COMPLETED', 699.00),
(6, '2026-11-06', 'PENDING', 249.00),
(7, '2026-11-07', 'COMPLETED', 1879.00),
(8, '2026-11-08', 'COMPLETED', 370.00),
(1, '2026-11-09', 'COMPLETED', 1299.00),
(2, '2026-11-10', 'COMPLETED', 699.00),
(3, '2026-11-11', 'PROCESSING', 499.00),
(4, '2026-11-12', 'COMPLETED', 370.00),
(5, '2026-11-13', 'COMPLETED', 1999.00),
(6, '2026-11-14', 'COMPLETED', 1699.00),
(7, '2026-11-15', 'COMPLETED', 1448.00),
(8, '2026-11-16', 'COMPLETED', 879.00)
ON CONFLICT DO NOTHING;

-- Seed Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1299.00),
(1, 5, 1, 399.00),
(2, 3, 1, 1999.00),
(3, 9, 1, 180.00),
(3, 5, 1, 399.00),
(4, 2, 1, 1199.00),
(5, 7, 1, 699.00),
(6, 6, 1, 249.00),
(7, 4, 1, 1699.00),
(7, 9, 1, 180.00),
(8, 9, 1, 180.00),
(8, 10, 1, 190.00),
(9, 1, 1, 1299.00),
(10, 7, 1, 699.00),
(11, 8, 1, 499.00),
(12, 10, 1, 190.00),
(12, 9, 1, 180.00),
(13, 3, 1, 1999.00),
(14, 4, 1, 1699.00),
(15, 1, 1, 1299.00),
(15, 6, 1, 249.00),
(16, 5, 1, 399.00),
(16, 8, 1, 499.00)
ON CONFLICT DO NOTHING;

