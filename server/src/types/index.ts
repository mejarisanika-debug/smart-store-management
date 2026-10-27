export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  expiry_date: string | null; // Nullable for non-perishable goods
  threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id?: number;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number; // Historical selling price snapshot
  unit_cost: number; // Historical cost price snapshot
  subtotal: number;
}

export interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  payment_method: 'UPI' | 'Cash' | 'Card';
  notes?: string | null;
  items?: SaleItem[];
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'Utilities' | 'Rent' | 'Logistics' | 'Maintenance' | 'Staff' | 'Other';
  amount: number;
  expense_date: string;
  created_at: string;
}

export interface InventoryLog {
  id?: number;
  product_id: string;
  change_type: 'SALE' | 'RESTOCK' | 'MANUAL_DEDUCTION' | 'PRICE_CHANGE' | 'INITIAL_STOCK';
  quantity_delta: number;
  stock_before: number;
  stock_after: number;
  reason?: string | null;
  created_at: string;
}

export interface CheckoutRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  paymentMethod: 'UPI' | 'Cash' | 'Card';
  notes?: string;
  idempotencyKey?: string;
}

export interface ExpiryStatus {
  daysRemaining: number | null;
  status: 'Expired' | 'Near expiry' | 'Valid' | 'Non-perishable';
  tone: 'danger' | 'warning' | 'success' | 'neutral';
  saleAllowed: boolean;
}
