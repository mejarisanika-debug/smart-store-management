-- =============================================================================
-- Smart Store Management System — PostgreSQL Database Schema
-- Target: Supabase PostgreSQL / Standard PostgreSQL 14+
-- Version: 1.1
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Products Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    expiry_date DATE NULL, -- Nullable for non-perishable goods (e.g., utensils, stationery)
    threshold INTEGER NOT NULL DEFAULT 5 CHECK (threshold >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft-delete flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for high-velocity queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- -----------------------------------------------------------------------------
-- 2. Sales Table (Header)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY, -- Invoice Number e.g. INV-1001
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Card')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

-- -----------------------------------------------------------------------------
-- 3. Sale Items Table (Line Items with Historical Price & Cost Snapshots)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL, -- Snapshot of name at sale time
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0), -- Snapshot of selling price
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0), -- Snapshot of cost price for profit accuracy
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- -----------------------------------------------------------------------------
-- 4. Expenses Table (Operating Overheads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY, -- e.g. EXP-001
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Utilities', 'Rent', 'Logistics', 'Maintenance', 'Staff', 'Other')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- -----------------------------------------------------------------------------
-- 5. Inventory Logs Table (Audit Trail of Stock Movements)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('SALE', 'RESTOCK', 'MANUAL_DEDUCTION', 'PRICE_CHANGE', 'INITIAL_STOCK')),
    quantity_delta INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
