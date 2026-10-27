-- =============================================================================
-- Smart Store Management System — Seed Data
-- =============================================================================

-- Clean up any existing data in reverse order of foreign keys
TRUNCATE TABLE inventory_logs CASCADE;
TRUNCATE TABLE sale_items CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE products CASCADE;

-- -----------------------------------------------------------------------------
-- Seed Products (Including Perishables, Expired, Low Stock, & Non-Perishables)
-- -----------------------------------------------------------------------------
INSERT INTO products (id, name, category, price, cost, stock, expiry_date, threshold, is_active) VALUES
('PRD-001', 'Aashirvaad Atta 5kg', 'Staples', 315.00, 264.00, 28, CURRENT_DATE + INTERVAL '120 days', 10, TRUE),
('PRD-002', 'Fortune Sunflower Oil 1L', 'Cooking', 148.00, 126.00, 8, CURRENT_DATE + INTERVAL '80 days', 12, TRUE),
('PRD-003', 'Tata Salt 1kg', 'Staples', 28.00, 22.00, 42, CURRENT_DATE + INTERVAL '240 days', 15, TRUE),
('PRD-004', 'Amul Taaza Milk 500ml', 'Dairy', 72.00, 64.00, 9, CURRENT_DATE + INTERVAL '3 days', 12, TRUE),
('PRD-005', 'Parle-G Biscuits 250g', 'Snacks', 30.00, 24.00, 64, CURRENT_DATE + INTERVAL '65 days', 18, TRUE),
('PRD-006', 'India Gate Basmati Rice 1kg', 'Staples', 799.00, 690.00, 14, CURRENT_DATE + INTERVAL '190 days', 8, TRUE),
('PRD-007', 'Maggi 2-Minute Noodles 4pk', 'Instant Food', 56.00, 46.00, 6, CURRENT_DATE + INTERVAL '25 days', 14, TRUE),
('PRD-008', 'Britannia Brown Bread 400g', 'Bakery', 55.00, 41.00, 5, CURRENT_DATE - INTERVAL '1 day', 8, TRUE),
('PRD-009', 'Surf Excel Matic Liquid 1L', 'Home Care', 245.00, 210.00, 21, CURRENT_DATE + INTERVAL '300 days', 7, TRUE),
('PRD-010', 'Nescafé Classic Coffee 50g', 'Beverages', 185.00, 152.00, 11, CURRENT_DATE + INTERVAL '150 days', 8, TRUE),
-- Non-perishable products with NULL expiry date:
('PRD-011', 'Scotch-Brite Steel Scrubber 3pk', 'Cleaning', 65.00, 48.00, 35, NULL, 10, TRUE),
('PRD-012', 'Milton Plastic Storage Container 1L', 'Home Care', 120.00, 88.00, 18, NULL, 6, TRUE),
('PRD-013', 'Gala Dust Floor Broom', 'Cleaning', 190.00, 140.00, 12, NULL, 5, TRUE);

-- Initial stock logs
INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
SELECT id, 'INITIAL_STOCK', stock, 0, stock, 'Opening inventory on system setup' FROM products;

-- -----------------------------------------------------------------------------
-- Seed Past Sales (Completed In-Store Transactions)
-- -----------------------------------------------------------------------------
INSERT INTO sales (id, sale_date, total_amount, payment_method, notes) VALUES
('INV-1042', CURRENT_TIMESTAMP - INTERVAL '6 days', 574.00, 'Cash', 'Counter bill'),
('INV-1043', CURRENT_TIMESTAMP - INTERVAL '5 days', 630.00, 'Card', 'Counter bill'),
('INV-1044', CURRENT_TIMESTAMP - INTERVAL '4 days', 936.00, 'UPI', 'Quick scan counter'),
('INV-1045', CURRENT_TIMESTAMP - INTERVAL '3 days', 590.00, 'UPI', 'Regular customer'),
('INV-1046', CURRENT_TIMESTAMP - INTERVAL '2 days', 592.00, 'Cash', 'Counter bill'),
('INV-1047', CURRENT_TIMESTAMP - INTERVAL '1 day',  1079.00, 'Card', 'Weekly grocery basket'),
('INV-1048', CURRENT_TIMESTAMP - INTERVAL '2 hours', 688.00, 'UPI', 'Counter bill');

-- -----------------------------------------------------------------------------
-- Seed Sale Items (With Historical Price & Cost Snapshots)
-- -----------------------------------------------------------------------------
-- INV-1042
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1042', 'PRD-003', 'Tata Salt 1kg', 3, 28.00, 22.00, 84.00),
('INV-1042', 'PRD-009', 'Surf Excel Matic Liquid 1L', 2, 245.00, 210.00, 490.00);

-- INV-1043
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1043', 'PRD-001', 'Aashirvaad Atta 5kg', 2, 315.00, 264.00, 630.00);

-- INV-1044
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1044', 'PRD-004', 'Amul Taaza Milk 500ml', 6, 72.00, 64.00, 432.00),
('INV-1044', 'PRD-002', 'Fortune Sunflower Oil 1L', 3, 148.00, 126.00, 444.00),
('INV-1044', 'PRD-005', 'Parle-G Biscuits 250g', 2, 30.00, 24.00, 60.00);

-- INV-1045
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1045', 'PRD-007', 'Maggi 2-Minute Noodles 4pk', 5, 56.00, 46.00, 280.00),
('INV-1045', 'PRD-009', 'Surf Excel Matic Liquid 1L', 1, 245.00, 210.00, 245.00),
('INV-1045', 'PRD-011', 'Scotch-Brite Steel Scrubber 3pk', 1, 65.00, 48.00, 65.00);

-- INV-1046
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1046', 'PRD-002', 'Fortune Sunflower Oil 1L', 4, 148.00, 126.00, 592.00);

-- INV-1047
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1047', 'PRD-006', 'India Gate Basmati Rice 1kg', 1, 799.00, 690.00, 799.00),
('INV-1047', 'PRD-010', 'Nescafé Classic Coffee 50g', 1, 185.00, 152.00, 185.00),
('INV-1047', 'PRD-005', 'Parle-G Biscuits 250g', 1, 30.00, 24.00, 30.00),
('INV-1047', 'PRD-011', 'Scotch-Brite Steel Scrubber 3pk', 1, 65.00, 48.00, 65.00);

-- INV-1048
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
('INV-1048', 'PRD-001', 'Aashirvaad Atta 5kg', 2, 315.00, 264.00, 630.00),
('INV-1048', 'PRD-003', 'Tata Salt 1kg', 1, 28.00, 22.00, 28.00),
('INV-1048', 'PRD-005', 'Parle-G Biscuits 250g', 1, 30.00, 24.00, 30.00);

-- -----------------------------------------------------------------------------
-- Seed Operating Expenses
-- -----------------------------------------------------------------------------
INSERT INTO expenses (id, title, category, amount, expense_date) VALUES
('EXP-001', 'Shop Monthly Rent', 'Rent', 4200.00, CURRENT_DATE - INTERVAL '5 days'),
('EXP-002', 'Electricity Bill (MSEDCL)', 'Utilities', 1240.00, CURRENT_DATE - INTERVAL '2 days'),
('EXP-003', 'Tempo Goods Logistics Delivery', 'Logistics', 460.00, CURRENT_DATE);
