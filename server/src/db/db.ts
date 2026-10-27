import pg from 'pg';
import { config, redactDatabaseUrl } from '../config.js';
import { Product, Sale, SaleItem, Expense, InventoryLog, CheckoutRequest } from '../types/index.js';

const { Pool } = pg;

export interface DBEngine {
  isPostgres: boolean;
  getProducts(category?: string, search?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | null>;
  softDeleteProduct(id: string): Promise<boolean>;
  updatePrice(id: string, newPrice: number): Promise<{ id: string; oldPrice: number; newPrice: number; margin: number } | null>;
  updateExpiry(id: string, newExpiry: string | null): Promise<Product | null>;
  restockProduct(id: string, quantity: number, notes?: string): Promise<Product | null>;
  deductStock(id: string, quantity: number, reason: string): Promise<Product | null>;
  executeCheckout(checkout: CheckoutRequest): Promise<Sale>;
  getSales(search?: string, limit?: number): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | null>;
  getExpenses(category?: string): Promise<Expense[]>;
  createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;
  getInventoryLogs(productId?: string): Promise<InventoryLog[]>;
  checkHealth(): Promise<{ status: string; engine: string; timestamp: string }>;
}

// ---------------------------------------------------------------------------
// In-Memory Database (Used when DATABASE_URL is not yet configured)
// ---------------------------------------------------------------------------
class MemoryDB implements DBEngine {
  public isPostgres = false;
  private products: Product[] = [];
  private sales: Sale[] = [];
  private expenses: Expense[] = [];
  private logs: InventoryLog[] = [];
  private processedIdempotencyKeys = new Set<string>();

  constructor() {
    this.seed();
  }

  private dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private seed() {
    this.products = [
      { id: 'PRD-001', name: 'Aashirvaad Atta 5kg', category: 'Staples', price: 315, cost: 264, stock: 28, expiry_date: this.dateOffset(120), threshold: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-002', name: 'Fortune Sunflower Oil 1L', category: 'Cooking', price: 148, cost: 126, stock: 8, expiry_date: this.dateOffset(80), threshold: 12, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-003', name: 'Tata Salt 1kg', category: 'Staples', price: 28, cost: 22, stock: 42, expiry_date: this.dateOffset(240), threshold: 15, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-004', name: 'Amul Taaza Milk 500ml', category: 'Dairy', price: 72, cost: 64, stock: 9, expiry_date: this.dateOffset(3), threshold: 12, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-005', name: 'Parle-G Biscuits 250g', category: 'Snacks', price: 30, cost: 24, stock: 64, expiry_date: this.dateOffset(65), threshold: 18, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-006', name: 'India Gate Basmati Rice 1kg', category: 'Staples', price: 799, cost: 690, stock: 14, expiry_date: this.dateOffset(190), threshold: 8, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-007', name: 'Maggi 2-Minute Noodles 4pk', category: 'Instant Food', price: 56, cost: 46, stock: 6, expiry_date: this.dateOffset(25), threshold: 14, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-008', name: 'Britannia Brown Bread 400g', category: 'Bakery', price: 55, cost: 41, stock: 5, expiry_date: this.dateOffset(-1), threshold: 8, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-009', name: 'Surf Excel Matic Liquid 1L', category: 'Home Care', price: 245, cost: 210, stock: 21, expiry_date: this.dateOffset(300), threshold: 7, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-010', name: 'Nescafé Classic Coffee 50g', category: 'Beverages', price: 185, cost: 152, stock: 11, expiry_date: this.dateOffset(150), threshold: 8, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      // Non-perishable products with NULL expiry date:
      { id: 'PRD-011', name: 'Scotch-Brite Steel Scrubber 3pk', category: 'Cleaning', price: 65, cost: 48, stock: 35, expiry_date: null, threshold: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-012', name: 'Milton Storage Container 1L', category: 'Home Care', price: 120, cost: 88, stock: 18, expiry_date: null, threshold: 6, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'PRD-013', name: 'Gala Dust Floor Broom', category: 'Cleaning', price: 190, cost: 140, stock: 12, expiry_date: null, threshold: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];

    this.sales = [
      { id: 'INV-1048', sale_date: this.dateOffset(0), total_amount: 688, payment_method: 'UPI', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1048', product_id: 'PRD-001', product_name: 'Aashirvaad Atta 5kg', quantity: 2, unit_price: 315, unit_cost: 264, subtotal: 630 },
        { sale_id: 'INV-1048', product_id: 'PRD-003', product_name: 'Tata Salt 1kg', quantity: 1, unit_price: 28, unit_cost: 22, subtotal: 28 },
        { sale_id: 'INV-1048', product_id: 'PRD-005', product_name: 'Parle-G Biscuits 250g', quantity: 1, unit_price: 30, unit_cost: 24, subtotal: 30 }
      ]},
      { id: 'INV-1047', sale_date: this.dateOffset(-1), total_amount: 1079, payment_method: 'Card', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1047', product_id: 'PRD-006', product_name: 'India Gate Basmati Rice 1kg', quantity: 1, unit_price: 799, unit_cost: 690, subtotal: 799 },
        { sale_id: 'INV-1047', product_id: 'PRD-010', product_name: 'Nescafé Classic Coffee 50g', quantity: 1, unit_price: 185, unit_cost: 152, subtotal: 185 },
        { sale_id: 'INV-1047', product_id: 'PRD-005', product_name: 'Parle-G Biscuits 250g', quantity: 1, unit_price: 30, unit_cost: 24, subtotal: 30 },
        { sale_id: 'INV-1047', product_id: 'PRD-011', product_name: 'Scotch-Brite Steel Scrubber 3pk', quantity: 1, unit_price: 65, unit_cost: 48, subtotal: 65 }
      ]},
      { id: 'INV-1046', sale_date: this.dateOffset(-2), total_amount: 592, payment_method: 'Cash', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1046', product_id: 'PRD-002', product_name: 'Fortune Sunflower Oil 1L', quantity: 4, unit_price: 148, unit_cost: 126, subtotal: 592 }
      ]},
      { id: 'INV-1045', sale_date: this.dateOffset(-3), total_amount: 590, payment_method: 'UPI', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1045', product_id: 'PRD-007', product_name: 'Maggi 2-Minute Noodles 4pk', quantity: 5, unit_price: 56, unit_cost: 46, subtotal: 280 },
        { sale_id: 'INV-1045', product_id: 'PRD-009', product_name: 'Surf Excel Matic Liquid 1L', quantity: 1, unit_price: 245, unit_cost: 210, subtotal: 245 },
        { sale_id: 'INV-1045', product_id: 'PRD-011', product_name: 'Scotch-Brite Steel Scrubber 3pk', quantity: 1, unit_price: 65, unit_cost: 48, subtotal: 65 }
      ]},
      { id: 'INV-1044', sale_date: this.dateOffset(-4), total_amount: 936, payment_method: 'UPI', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1044', product_id: 'PRD-004', product_name: 'Amul Taaza Milk 500ml', quantity: 6, unit_price: 72, unit_cost: 64, subtotal: 432 },
        { sale_id: 'INV-1044', product_id: 'PRD-002', product_name: 'Fortune Sunflower Oil 1L', quantity: 3, unit_price: 148, unit_cost: 126, subtotal: 444 },
        { sale_id: 'INV-1044', product_id: 'PRD-005', product_name: 'Parle-G Biscuits 250g', quantity: 2, unit_price: 30, unit_cost: 24, subtotal: 60 }
      ]},
      { id: 'INV-1043', sale_date: this.dateOffset(-5), total_amount: 630, payment_method: 'Card', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1043', product_id: 'PRD-001', product_name: 'Aashirvaad Atta 5kg', quantity: 2, unit_price: 315, unit_cost: 264, subtotal: 630 }
      ]},
      { id: 'INV-1042', sale_date: this.dateOffset(-6), total_amount: 574, payment_method: 'Cash', created_at: new Date().toISOString(), items: [
        { sale_id: 'INV-1042', product_id: 'PRD-003', product_name: 'Tata Salt 1kg', quantity: 3, unit_price: 28, unit_cost: 22, subtotal: 84 },
        { sale_id: 'INV-1042', product_id: 'PRD-009', product_name: 'Surf Excel Matic Liquid 1L', quantity: 2, unit_price: 245, unit_cost: 210, subtotal: 490 }
      ]}
    ];

    this.expenses = [
      { id: 'EXP-001', title: 'Shop Monthly Rent', category: 'Rent', amount: 4200, expense_date: this.dateOffset(-5), created_at: new Date().toISOString() },
      { id: 'EXP-002', title: 'Electricity Bill (MSEDCL)', category: 'Utilities', amount: 1240, expense_date: this.dateOffset(-2), created_at: new Date().toISOString() },
      { id: 'EXP-003', title: 'Tempo Goods Logistics Delivery', category: 'Logistics', amount: 460, expense_date: this.dateOffset(0), created_at: new Date().toISOString() }
    ];
  }

  async checkHealth() {
    return {
      status: 'healthy',
      engine: 'In-Memory DB Engine (Development Fallback - DATABASE_URL not set)',
      connected: false,
      tableVerified: false,
      productsCount: this.products.length,
      timestamp: new Date().toISOString()
    };
  }

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    let list = this.products.filter(p => p.is_active);
    if (category && category !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  }

  async getProductById(id: string): Promise<Product | null> {
    const p = this.products.find(item => item.id === id);
    return p ? { ...p } : null;
  }

  async createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<Product> {
    const exists = this.products.find(p => p.id === product.id);
    if (exists) {
      throw new Error(`Product with ID "${product.id}" already exists.`);
    }
    const newProduct: Product = {
      ...product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.products.push(newProduct);
    this.logs.push({
      product_id: newProduct.id,
      change_type: 'INITIAL_STOCK',
      quantity_delta: newProduct.stock,
      stock_before: 0,
      stock_after: newProduct.stock,
      reason: 'Product created in catalogue',
      created_at: new Date().toISOString()
    });
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    const old = this.products[index];
    const updated: Product = {
      ...old,
      ...updates,
      id: old.id, // Immutable ID
      updated_at: new Date().toISOString()
    };
    this.products[index] = updated;
    return updated;
  }

  async softDeleteProduct(id: string): Promise<boolean> {
    const p = this.products.find(item => item.id === id);
    if (!p) return false;
    p.is_active = false;
    p.updated_at = new Date().toISOString();
    return true;
  }

  async updatePrice(id: string, newPrice: number): Promise<{ id: string; oldPrice: number; newPrice: number; margin: number } | null> {
    const product = this.products.find(p => p.id === id);
    if (!product) return null;
    const oldPrice = product.price;
    product.price = newPrice;
    product.updated_at = new Date().toISOString();
    const margin = ((newPrice - product.cost) / newPrice) * 100;

    this.logs.push({
      product_id: product.id,
      change_type: 'PRICE_CHANGE',
      quantity_delta: 0,
      stock_before: product.stock,
      stock_after: product.stock,
      reason: `Price changed from ₹${oldPrice} to ₹${newPrice}`,
      created_at: new Date().toISOString()
    });

    return { id, oldPrice, newPrice, margin };
  }

  async updateExpiry(id: string, newExpiry: string | null): Promise<Product | null> {
    const product = this.products.find(p => p.id === id);
    if (!product) return null;
    product.expiry_date = newExpiry;
    product.updated_at = new Date().toISOString();
    return { ...product };
  }

  async restockProduct(id: string, quantity: number, notes?: string): Promise<Product | null> {
    const product = this.products.find(p => p.id === id);
    if (!product) return null;
    const before = product.stock;
    product.stock += quantity;
    product.updated_at = new Date().toISOString();

    this.logs.push({
      product_id: product.id,
      change_type: 'RESTOCK',
      quantity_delta: quantity,
      stock_before: before,
      stock_after: product.stock,
      reason: notes || `Restocked ${quantity} units`,
      created_at: new Date().toISOString()
    });

    return { ...product };
  }

  async deductStock(id: string, quantity: number, reason: string): Promise<Product | null> {
    const product = this.products.find(p => p.id === id);
    if (!product) return null;
    if (quantity > product.stock) {
      throw new Error(`Cannot deduct ${quantity} units. Only ${product.stock} units available.`);
    }
    const before = product.stock;
    product.stock -= quantity;
    product.updated_at = new Date().toISOString();

    this.logs.push({
      product_id: product.id,
      change_type: 'MANUAL_DEDUCTION',
      quantity_delta: -quantity,
      stock_before: before,
      stock_after: product.stock,
      reason: reason || 'Manual stock deduction',
      created_at: new Date().toISOString()
    });

    return { ...product };
  }

  /**
   * ATOMIC CHECKOUT TRANSACTION (In-Memory Simulator)
   * Enforces:
   * 1. Idempotency (prevent duplicate submissions)
   * 2. Stock availability check (reject if insufficient)
   * 3. Expiry date check ONLY if expiry_date is NOT NULL (non-perishables skip this check!)
   * 4. Stock deduction with negative-stock prevention
   * 5. Immutable snapshots of unit_price and unit_cost
   * 6. Inventory audit log generation
   * 7. All or nothing commit / rollback
   */
  async executeCheckout(checkout: CheckoutRequest): Promise<Sale> {
    if (checkout.idempotencyKey) {
      if (this.processedIdempotencyKeys.has(checkout.idempotencyKey)) {
        throw new Error('Duplicate checkout submission detected. Order was already processed.');
      }
      this.processedIdempotencyKeys.add(checkout.idempotencyKey);
    }

    if (!checkout.items || checkout.items.length === 0) {
      throw new Error('Cannot checkout an empty cart.');
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const saleItems: SaleItem[] = [];
    let calculatedTotal = 0;

    // STEP 1: Pre-validation of all candidate items (Pre-Flight Checks)
    const productSnapshotMap = new Map<string, Product>();

    for (const item of checkout.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for item ${item.productId}.`);
      }
      const product = this.products.find(p => p.id === item.productId && p.is_active);
      if (!product) {
        throw new Error(`Product ${item.productId} not found or is no longer active.`);
      }

      // Check Expiry Date (ONLY if expiry_date is set! Nullable for non-perishables)
      if (product.expiry_date !== null && product.expiry_date < todayStr) {
        throw new Error(`Cannot sell expired product: "${product.name}" expired on ${product.expiry_date}.`);
      }

      // Check Stock Availability
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}.`);
      }

      productSnapshotMap.set(item.productId, product);
    }

    // STEP 2: Atomic Execution
    const newSaleId = `INV-${1049 + this.sales.length}`;

    for (const item of checkout.items) {
      const product = productSnapshotMap.get(item.productId)!;
      const subtotal = product.price * item.quantity;
      calculatedTotal += subtotal;

      saleItems.push({
        sale_id: newSaleId,
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price, // Historical price snapshot
        unit_cost: product.cost,   // Historical cost snapshot
        subtotal
      });

      // Deduct stock
      const stockBefore = product.stock;
      product.stock -= item.quantity;
      product.updated_at = new Date().toISOString();

      // Audit Log
      this.logs.push({
        product_id: product.id,
        change_type: 'SALE',
        quantity_delta: -item.quantity,
        stock_before: stockBefore,
        stock_after: product.stock,
        reason: `Sold in bill ${newSaleId}`,
        created_at: new Date().toISOString()
      });
    }

    const newSale: Sale = {
      id: newSaleId,
      sale_date: new Date().toISOString(),
      total_amount: calculatedTotal,
      payment_method: checkout.paymentMethod,
      notes: checkout.notes || 'Counter sale',
      items: saleItems,
      created_at: new Date().toISOString()
    };

    this.sales.unshift(newSale);
    return newSale;
  }

  async getSales(search?: string, limit: number = 50): Promise<Sale[]> {
    let list = [...this.sales];
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.payment_method.toLowerCase().includes(q) ||
        (s.items && s.items.some(i => i.product_name.toLowerCase().includes(q)))
      );
    }
    return list.slice(0, limit);
  }

  async getSaleById(id: string): Promise<Sale | null> {
    const s = this.sales.find(item => item.id === id);
    return s ? { ...s } : null;
  }

  async getExpenses(category?: string): Promise<Expense[]> {
    let list = [...this.expenses];
    if (category && category !== 'All') {
      list = list.filter(e => e.category.toLowerCase() === category.toLowerCase());
    }
    return list.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }

  async createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const id = `EXP-${String(this.expenses.length + 1).padStart(3, '0')}`;
    const newExpense: Expense = {
      ...expense,
      id,
      created_at: new Date().toISOString()
    };
    this.expenses.unshift(newExpense);
    return newExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const initial = this.expenses.length;
    this.expenses = this.expenses.filter(e => e.id !== id);
    return this.expenses.length < initial;
  }

  async getInventoryLogs(productId?: string): Promise<InventoryLog[]> {
    if (productId) {
      return this.logs.filter(l => l.product_id === productId);
    }
    return [...this.logs].reverse();
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL Adapter (Connects directly to Supabase PostgreSQL via Pool)
// ---------------------------------------------------------------------------
class PostgresDB implements DBEngine {
  public isPostgres = true;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Supabase pooled connections support SSL
      },
      max: 10,
      idleTimeoutMillis: 30000
    });
  }

  async checkHealth() {
    const res = await this.pool.query('SELECT NOW() as current_time, count(*) as count FROM products');
    return {
      status: 'healthy',
      engine: 'Supabase PostgreSQL Connection Pool (Live Database)',
      connected: true,
      tableVerified: true,
      productsCount: Number(res.rows[0].count),
      timestamp: res.rows[0].current_time
    };
  }

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    let query = 'SELECT * FROM products WHERE is_active = TRUE';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND LOWER(category) = LOWER($${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    query += ' ORDER BY name ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(row => ({
      ...row,
      price: Number(row.price),
      cost: Number(row.cost),
      stock: Number(row.stock),
      threshold: Number(row.threshold),
      is_active: Boolean(row.is_active),
      expiry_date: row.expiry_date instanceof Date ? row.expiry_date.toISOString().slice(0, 10) : (row.expiry_date ? String(row.expiry_date).slice(0, 10) : null),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    }));
  }

  async getProductById(id: string): Promise<Product | null> {
    const res = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      price: Number(row.price),
      cost: Number(row.cost),
      stock: Number(row.stock),
      threshold: Number(row.threshold),
      is_active: Boolean(row.is_active),
      expiry_date: row.expiry_date instanceof Date ? row.expiry_date.toISOString().slice(0, 10) : (row.expiry_date ? String(row.expiry_date).slice(0, 10) : null),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  async createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<Product> {
    const query = `
      INSERT INTO products (id, name, category, price, cost, stock, expiry_date, threshold, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const params = [
      product.id,
      product.name,
      product.category,
      product.price,
      product.cost,
      product.stock,
      product.expiry_date,
      product.threshold,
      product.is_active ?? true
    ];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(query, params);
      const inserted = res.rows[0];

      // Audit log
      await client.query(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
        VALUES ($1, 'INITIAL_STOCK', $2, 0, $2, 'Product registered in catalog');
      `, [product.id, product.stock]);

      await client.query('COMMIT');
      return {
        ...inserted,
        price: Number(inserted.price),
        cost: Number(inserted.cost),
        stock: Number(inserted.stock),
        threshold: Number(inserted.threshold)
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { values.push(updates.name); fields.push(`name = $${values.length}`); }
    if (updates.category !== undefined) { values.push(updates.category); fields.push(`category = $${values.length}`); }
    if (updates.price !== undefined) { values.push(updates.price); fields.push(`price = $${values.length}`); }
    if (updates.cost !== undefined) { values.push(updates.cost); fields.push(`cost = $${values.length}`); }
    if (updates.stock !== undefined) { values.push(updates.stock); fields.push(`stock = $${values.length}`); }
    if (updates.expiry_date !== undefined) { values.push(updates.expiry_date); fields.push(`expiry_date = $${values.length}`); }
    if (updates.threshold !== undefined) { values.push(updates.threshold); fields.push(`threshold = $${values.length}`); }
    if (updates.is_active !== undefined) { values.push(updates.is_active); fields.push(`is_active = $${values.length}`); }

    if (fields.length === 0) return this.getProductById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *;`;
    const res = await this.pool.query(query, values);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      price: Number(row.price),
      cost: Number(row.cost),
      stock: Number(row.stock),
      threshold: Number(row.threshold)
    };
  }

  async softDeleteProduct(id: string): Promise<boolean> {
    const res = await this.pool.query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async updatePrice(id: string, newPrice: number): Promise<{ id: string; oldPrice: number; newPrice: number; margin: number } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT price, cost, stock, is_active FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (!cur.rows[0] || !cur.rows[0].is_active) {
        await client.query('ROLLBACK');
        return null;
      }
      const oldPrice = Number(cur.rows[0].price);
      const cost = Number(cur.rows[0].cost);
      const stock = Number(cur.rows[0].stock);

      await client.query('UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2', [newPrice, id]);

      await client.query(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
        VALUES ($1, 'PRICE_CHANGE', 0, $2, $2, $3)
      `, [id, stock, `Price revised from ₹${oldPrice} to ₹${newPrice}`]);

      await client.query('COMMIT');
      const margin = ((newPrice - cost) / newPrice) * 100;
      return { id, oldPrice, newPrice, margin };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateExpiry(id: string, newExpiry: string | null): Promise<Product | null> {
    const res = await this.pool.query(
      'UPDATE products SET expiry_date = $1, updated_at = NOW() WHERE id = $2 AND is_active = TRUE RETURNING *',
      [newExpiry, id]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      price: Number(row.price),
      cost: Number(row.cost),
      stock: Number(row.stock),
      threshold: Number(row.threshold)
    };
  }

  async restockProduct(id: string, quantity: number, notes?: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT stock, is_active FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (!cur.rows[0] || !cur.rows[0].is_active) {
        await client.query('ROLLBACK');
        return null;
      }
      const before = Number(cur.rows[0].stock);
      const after = before + quantity;

      const updatedRes = await client.query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [after, id]
      );

      await client.query(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
        VALUES ($1, 'RESTOCK', $2, $3, $4, $5)
      `, [id, quantity, before, after, notes || `Restocked ${quantity} units`]);

      await client.query('COMMIT');
      const row = updatedRes.rows[0];
      return {
        ...row,
        price: Number(row.price),
        cost: Number(row.cost),
        stock: Number(row.stock),
        threshold: Number(row.threshold)
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deductStock(id: string, quantity: number, reason: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT stock, is_active FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (!cur.rows[0] || !cur.rows[0].is_active) {
        await client.query('ROLLBACK');
        return null;
      }
      const before = Number(cur.rows[0].stock);
      if (quantity > before) {
        throw new Error(`Cannot deduct ${quantity} units. Only ${before} units in stock.`);
      }
      const after = before - quantity;

      const updatedRes = await client.query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [after, id]
      );

      await client.query(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
        VALUES ($1, 'MANUAL_DEDUCTION', $2, $3, $4, $5)
      `, [id, -quantity, before, after, reason || 'Manual stock deduction']);

      await client.query('COMMIT');
      const row = updatedRes.rows[0];
      return {
        ...row,
        price: Number(row.price),
        cost: Number(row.cost),
        stock: Number(row.stock),
        threshold: Number(row.threshold)
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * ATOMIC POSTGRES TRANSACTION FOR POINT OF SALE CHECKOUT
   * - Row-level locking (SELECT ... FOR UPDATE) handles concurrent counters
   * - Validates stock >= quantity
   * - Validates expiry ONLY IF expiry_date IS NOT NULL (handles non-perishables correctly)
   * - Creates Sale record
   * - Creates Sale Items with historical snapshot prices & costs
   * - Deducts product stock
   * - Writes audit records to inventory_logs
   * - Commits atomically; rolls back if anything fails
   */
  async executeCheckout(checkout: CheckoutRequest): Promise<Sale> {
    if (!checkout.items || checkout.items.length === 0) {
      throw new Error('Cannot checkout an empty cart.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const productIds = checkout.items.map(i => i.productId);
      const queryLocks = `
        SELECT id, name, category, price, cost, stock, expiry_date, threshold, is_active
        FROM products
        WHERE id = ANY($1)
        FOR UPDATE;
      `;
      const resLocks = await client.query(queryLocks, [productIds]);
      const productMap = new Map<string, any>();
      resLocks.rows.forEach(p => productMap.set(p.id, p));

      const todayStr = new Date().toISOString().slice(0, 10);
      let calculatedTotal = 0;
      const saleItemsToInsert: any[] = [];

      // Pre-validation under transaction locks
      for (const item of checkout.items) {
        if (item.quantity <= 0) {
          throw new Error(`Invalid quantity ${item.quantity} for item ${item.productId}.`);
        }
        const product = productMap.get(item.productId);
        if (!product || !product.is_active) {
          throw new Error(`Product ${item.productId} is not available.`);
        }

        // Nullable expiry validation: only enforce if expiry_date is NOT NULL!
        if (product.expiry_date) {
          const productExpStr = new Date(product.expiry_date).toISOString().slice(0, 10);
          if (productExpStr < todayStr) {
            throw new Error(`Cannot sell expired product: "${product.name}" expired on ${productExpStr}.`);
          }
        }

        // Stock validation
        const currentStock = Number(product.stock);
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${currentStock}.`);
        }

        const unitPrice = Number(product.price);
        const unitCost = Number(product.cost);
        const subtotal = unitPrice * item.quantity;
        calculatedTotal += subtotal;

        saleItemsToInsert.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          unitCost,
          subtotal,
          currentStock
        });
      }

      // Generate invoice number
      const countRes = await client.query('SELECT COUNT(*) FROM sales');
      const count = Number(countRes.rows[0].count);
      const saleId = `INV-${1049 + count}`;

      // Insert Sale Header
      await client.query(`
        INSERT INTO sales (id, sale_date, total_amount, payment_method, notes)
        VALUES ($1, NOW(), $2, $3, $4)
      `, [saleId, calculatedTotal, checkout.paymentMethod, checkout.notes || 'Counter sale']);

      // Insert Sale Items & Deduct Stock
      for (const line of saleItemsToInsert) {
        await client.query(`
          INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [saleId, line.productId, line.productName, line.quantity, line.unitPrice, line.unitCost, line.subtotal]);

        const newStock = line.currentStock - line.quantity;
        await client.query(`
          UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2
        `, [newStock, line.productId]);

        await client.query(`
          INSERT INTO inventory_logs (product_id, change_type, quantity_delta, stock_before, stock_after, reason)
          VALUES ($1, 'SALE', $2, $3, $4, $5)
        `, [line.productId, -line.quantity, line.currentStock, newStock, `Sold in bill ${saleId}`]);
      }

      await client.query('COMMIT');

      const sale = await this.getSaleById(saleId);
      if (!sale) throw new Error('Sale created but failed to retrieve.');
      return sale;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getSales(search?: string, limit: number = 50): Promise<Sale[]> {
    let query = `
      SELECT s.*, 
        json_agg(
          json_build_object(
            'id', si.id,
            'sale_id', si.sale_id,
            'product_id', si.product_id,
            'product_name', si.product_name,
            'quantity', si.quantity,
            'unit_price', si.unit_price,
            'unit_cost', si.unit_cost,
            'subtotal', si.subtotal
          )
        ) as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
    `;
    const params: any[] = [];
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` WHERE LOWER(s.id) LIKE $1 OR LOWER(s.payment_method) LIKE $1 OR LOWER(si.product_name) LIKE $1`;
    }
    query += ` GROUP BY s.id ORDER BY s.sale_date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      ...r,
      sale_date: r.sale_date instanceof Date ? r.sale_date.toISOString() : String(r.sale_date),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      total_amount: Number(r.total_amount),
      items: (r.items || []).filter((i: any) => i && i.product_id).map((i: any) => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        unit_cost: Number(i.unit_cost),
        subtotal: Number(i.subtotal)
      }))
    }));
  }

  async getSaleById(id: string): Promise<Sale | null> {
    const sRes = await this.pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (!sRes.rows[0]) return null;
    const sale = sRes.rows[0];

    const iRes = await this.pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
    return {
      ...sale,
      sale_date: sale.sale_date instanceof Date ? sale.sale_date.toISOString() : String(sale.sale_date),
      created_at: sale.created_at instanceof Date ? sale.created_at.toISOString() : String(sale.created_at),
      total_amount: Number(sale.total_amount),
      items: iRes.rows.map(r => ({
        ...r,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
        unit_cost: Number(r.unit_cost),
        subtotal: Number(r.subtotal)
      }))
    };
  }

  async getExpenses(category?: string): Promise<Expense[]> {
    let query = 'SELECT * FROM expenses';
    const params: any[] = [];
    if (category && category !== 'All') {
      params.push(category);
      query += ' WHERE LOWER(category) = LOWER($1)';
    }
    query += ' ORDER BY expense_date DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      expense_date: r.expense_date instanceof Date ? r.expense_date.toISOString().slice(0, 10) : String(r.expense_date).slice(0, 10),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
    }));
  }

  async createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const countRes = await this.pool.query('SELECT COUNT(*) FROM expenses');
    const id = `EXP-${String(Number(countRes.rows[0].count) + 1).padStart(3, '0')}`;
    const query = `
      INSERT INTO expenses (id, title, category, amount, expense_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await this.pool.query(query, [id, expense.title, expense.category, expense.amount, expense.expense_date]);
    const row = res.rows[0];
    return {
      ...row,
      amount: Number(row.amount)
    };
  }

  async deleteExpense(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getInventoryLogs(productId?: string): Promise<InventoryLog[]> {
    let query = 'SELECT * FROM inventory_logs';
    const params: any[] = [];
    if (productId) {
      params.push(productId);
      query += ' WHERE product_id = $1';
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      ...r,
      quantity_delta: Number(r.quantity_delta),
      stock_before: Number(r.stock_before),
      stock_after: Number(r.stock_after)
    }));
  }
}

// ---------------------------------------------------------------------------
// Singleton DB Instance Export & Safe Diagnostic Connection Check
// ---------------------------------------------------------------------------
const configuredUrl = config.databaseUrl;
let activeEngine: DBEngine;

if (configuredUrl) {
  const safeTarget = redactDatabaseUrl(configuredUrl);
  console.log(`[DB] Environment loaded from: ${config.loadedEnvPath || 'process.env'}`);
  console.log(`[DB] Attempting PostgreSQL connection to: ${safeTarget}`);

  const postgresDb = new PostgresDB(configuredUrl);
  activeEngine = postgresDb;

  // Asynchronous diagnostic connection probe (safe, non-sensitive logging)
  postgresDb.checkHealth()
    .then(health => {
      console.log(`[DB] PostgreSQL connection VERIFIED! Products count: ${health.productsCount} (Engine: ${health.engine})`);
    })
    .catch(err => {
      console.error(`[DB] PostgreSQL connection failed: [${err.code || 'ERROR'}] ${err.message}`);
      if (err.message.includes('ENOTFOUND') && configuredUrl.includes('db.')) {
        console.warn('[DB] NOTICE: Direct hostname "db.<ref>.supabase.co" failed because it is IPv6 only.');
        console.warn('[DB] Please use the Supabase Connection Pooler URI (port 5432 or 6543) which supports IPv4.');
      }
    });
} else {
  console.log('[DB] No DATABASE_URL configured. Initialized In-Memory DB Engine (Development Fallback).');
  activeEngine = new MemoryDB();
}

export const db: DBEngine = activeEngine;
