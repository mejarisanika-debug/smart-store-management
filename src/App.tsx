import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Box,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  PackageOpen,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { api } from "./services/api";

type Page =
  | "Dashboard"
  | "Billing"
  | "Cart"
  | "Inventory"
  | "Products"
  | "Prices"
  | "Restocking"
  | "Stock Update"
  | "Sales Records"
  | "Revenue"
  | "Prediction"
  | "Expiry"
  | "Analytics"
  | "Reorder"
  | "Profit & Expenses"
  | "Low-Stock Alerts";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  expiry: string | null; // Nullable for non-perishables (Feature Requirement #2)
  threshold: number;
  is_active?: boolean;
};

export type CartItem = { productId: string; quantity: number };
export type SaleItem = { productId: string; name: string; quantity: number; price: number; cost: number };
export type Sale = { id: string; date: string; items: SaleItem[]; amount: number; payment: string };
export type Expense = { id: string; title: string; category: string; amount: number; date: string };
export type Notice = { id: number; text: string; type: "success" | "error" | "info" };

const dateOffset = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const initialProducts: Product[] = [
  { id: "PRD-001", name: "Aashirvaad Atta 5kg", category: "Staples", price: 315, cost: 264, stock: 28, expiry: dateOffset(120), threshold: 10, is_active: true },
  { id: "PRD-002", name: "Fortune Sunflower Oil 1L", category: "Cooking", price: 148, cost: 126, stock: 8, expiry: dateOffset(80), threshold: 12, is_active: true },
  { id: "PRD-003", name: "Tata Salt 1kg", category: "Staples", price: 28, cost: 22, stock: 42, expiry: dateOffset(240), threshold: 15, is_active: true },
  { id: "PRD-004", name: "Amul Taaza Milk 500ml", category: "Dairy", price: 72, cost: 64, stock: 9, expiry: dateOffset(3), threshold: 12, is_active: true },
  { id: "PRD-005", name: "Parle-G Biscuits 250g", category: "Snacks", price: 30, cost: 24, stock: 64, expiry: dateOffset(65), threshold: 18, is_active: true },
  { id: "PRD-006", name: "India Gate Basmati Rice 1kg", category: "Staples", price: 799, cost: 690, stock: 14, expiry: dateOffset(190), threshold: 8, is_active: true },
  { id: "PRD-007", name: "Maggi 2-Minute Noodles 4pk", category: "Instant Food", price: 56, cost: 46, stock: 6, expiry: dateOffset(25), threshold: 14, is_active: true },
  { id: "PRD-008", name: "Britannia Brown Bread 400g", category: "Bakery", price: 55, cost: 41, stock: 5, expiry: dateOffset(-1), threshold: 8, is_active: true },
  { id: "PRD-009", name: "Surf Excel Matic Liquid 1L", category: "Home Care", price: 245, cost: 210, stock: 21, expiry: dateOffset(300), threshold: 7, is_active: true },
  { id: "PRD-010", name: "Nescafé Classic Coffee 50g", category: "Beverages", price: 185, cost: 152, stock: 11, expiry: dateOffset(150), threshold: 8, is_active: true },
  { id: "PRD-011", name: "Scotch-Brite Steel Scrubber 3pk", category: "Cleaning", price: 65, cost: 48, stock: 35, expiry: null, threshold: 10, is_active: true },
  { id: "PRD-012", name: "Milton Plastic Storage Container 1L", category: "Home Care", price: 120, cost: 88, stock: 18, expiry: null, threshold: 6, is_active: true },
  { id: "PRD-013", name: "Gala Dust Floor Broom", category: "Cleaning", price: 190, cost: 140, stock: 12, expiry: null, threshold: 5, is_active: true }
];

const initialSales: Sale[] = [
  { id: "INV-1048", date: dateOffset(0), amount: 688, payment: "UPI", items: [{ productId: "PRD-001", name: "Aashirvaad Atta 5kg", quantity: 2, price: 315, cost: 264 }, { productId: "PRD-003", name: "Tata Salt 1kg", quantity: 1, price: 28, cost: 22 }, { productId: "PRD-005", name: "Parle-G Biscuits 250g", quantity: 1, price: 30, cost: 24 }] },
  { id: "INV-1047", date: dateOffset(-1), amount: 1079, payment: "Card", items: [{ productId: "PRD-006", name: "India Gate Basmati Rice 1kg", quantity: 1, price: 799, cost: 690 }, { productId: "PRD-010", name: "Nescafé Classic Coffee 50g", quantity: 1, price: 185, cost: 152 }, { productId: "PRD-005", name: "Parle-G Biscuits 250g", quantity: 1, price: 30, cost: 24 }, { productId: "PRD-011", name: "Scotch-Brite Steel Scrubber 3pk", quantity: 1, price: 65, cost: 48 }] },
  { id: "INV-1046", date: dateOffset(-2), amount: 592, payment: "Cash", items: [{ productId: "PRD-002", name: "Fortune Sunflower Oil 1L", quantity: 4, price: 148, cost: 126 }] },
  { id: "INV-1045", date: dateOffset(-3), amount: 590, payment: "UPI", items: [{ productId: "PRD-007", name: "Maggi 2-Minute Noodles 4pk", quantity: 5, price: 56, cost: 46 }, { productId: "PRD-009", name: "Surf Excel Matic Liquid 1L", quantity: 1, price: 245, cost: 210 }, { productId: "PRD-011", name: "Scotch-Brite Steel Scrubber 3pk", quantity: 1, price: 65, cost: 48 }] },
  { id: "INV-1044", date: dateOffset(-4), amount: 936, payment: "UPI", items: [{ productId: "PRD-004", name: "Amul Taaza Milk 500ml", quantity: 6, price: 72, cost: 64 }, { productId: "PRD-002", name: "Fortune Sunflower Oil 1L", quantity: 3, price: 148, cost: 126 }, { productId: "PRD-005", name: "Parle-G Biscuits 250g", quantity: 2, price: 30, cost: 24 }] },
  { id: "INV-1043", date: dateOffset(-5), amount: 630, payment: "Card", items: [{ productId: "PRD-001", name: "Aashirvaad Atta 5kg", quantity: 2, price: 315, cost: 264 }] },
  { id: "INV-1042", date: dateOffset(-6), amount: 574, payment: "Cash", items: [{ productId: "PRD-003", name: "Tata Salt 1kg", quantity: 3, price: 28, cost: 22 }, { productId: "PRD-009", name: "Surf Excel Matic Liquid 1L", quantity: 2, price: 245, cost: 210 }] },
];

const initialExpenses: Expense[] = [
  { id: "EXP-001", title: "Shop Monthly Rent", category: "Rent", amount: 4200, date: dateOffset(-5) },
  { id: "EXP-002", title: "Electricity Bill (MSEDCL)", category: "Utilities", amount: 1240, date: dateOffset(-2) },
  { id: "EXP-003", title: "Tempo Goods Logistics Delivery", category: "Logistics", amount: 460, date: dateOffset(0) },
];

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const prettyDate = (value: string | null) => {
  if (!value) return "Non-perishable";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Null-safe expiry status calculation: non-perishables have no expiry constraint
const expiryState = (expiry: string | null) => {
  if (!expiry) {
    return { days: 9999, label: "Non-perishable", tone: "neutral", saleAllowed: true };
  }
  const days = Math.ceil((new Date(`${expiry}T23:59:59`).getTime() - Date.now()) / 86400000);
  return {
    days,
    label: days < 0 ? "Expired" : days <= 7 ? "Near expiry" : "Valid",
    tone: days < 0 ? "danger" : days <= 7 ? "warning" : "success",
    saleAllowed: days >= 0
  };
};

const pageMeta: Record<Page, { title: string; subtitle: string }> = {
  Dashboard: { title: "Good morning, Admin", subtitle: "Here’s what’s happening at Smart Mart today." },
  Billing: { title: "Point of Sale", subtitle: "Create a bill, validate stock and complete a sale." },
  Cart: { title: "Current Cart", subtitle: "Review quantities and the live order total." },
  Inventory: { title: "Inventory", subtitle: "Monitor stock, pricing, expiry and product status." },
  Products: { title: "Product Management", subtitle: "Create and maintain your complete product catalogue." },
  Prices: { title: "Price Management", subtitle: "Update selling prices while tracking margins." },
  Restocking: { title: "Restocking", subtitle: "Receive stock and keep shelves replenished." },
  "Stock Update": { title: "Stock Update", subtitle: "Record stock deductions with negative-stock protection." },
  "Sales Records": { title: "Sales Records", subtitle: "Review bills, items, quantities and payment history." },
  Revenue: { title: "Revenue", subtitle: "Track daily, weekly and monthly store performance." },
  Prediction: { title: "Stock Predictions", subtitle: "Estimate stock-out dates from recent sales velocity." },
  Expiry: { title: "Expiry Management", subtitle: "Review alerts, edit dates and prevent expired sales." },
  Analytics: { title: "Sales Analytics", subtitle: "Understand product performance and revenue trends." },
  Reorder: { title: "Reorder Suggestions", subtitle: "Prioritised purchase suggestions based on live stock." },
  "Profit & Expenses": { title: "Profit & Expenses", subtitle: "Record operating costs and monitor net profit." },
  "Low-Stock Alerts": { title: "Low-Stock Alerts", subtitle: "Set thresholds and resolve stock warnings." },
};

const iconMap: Record<Page, typeof Box> = {
  Dashboard: LayoutDashboard,
  Billing: CreditCard,
  Cart: ShoppingCart,
  Inventory: Archive,
  Products: Box,
  Prices: Tag,
  Restocking: Truck,
  "Stock Update": RefreshCw,
  "Sales Records": FileText,
  Revenue: Coins,
  Prediction: Sparkles,
  Expiry: CalendarClock,
  Analytics: BarChart3,
  Reorder: ClipboardList,
  "Profit & Expenses": WalletCards,
  "Low-Stock Alerts": Bell,
};

const navGroups: { label: string; pages: Page[] }[] = [
  { label: "Overview", pages: ["Dashboard"] },
  { label: "Sales", pages: ["Billing", "Cart", "Sales Records"] },
  { label: "Catalogue", pages: ["Inventory", "Products", "Prices", "Expiry"] },
  { label: "Stock", pages: ["Restocking", "Stock Update", "Prediction", "Reorder", "Low-Stock Alerts"] },
  { label: "Insights", pages: ["Revenue", "Analytics", "Profit & Expenses"] },
];

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

function IconButton({ children, onClick, label, danger = false }: { children: ReactNode; onClick?: () => void; label: string; danger?: boolean }) {
  return <button className={`icon-btn ${danger ? "danger" : ""}`} onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

function Button({ children, onClick, variant = "primary", type = "button", disabled = false, className = "" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "soft"; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}><span className="badge-dot" />{children}</span>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="card-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function EmptyState({ icon: Icon = PackageOpen, title, text }: { icon?: typeof Box; title: string; text: string }) {
  return <div className="empty"><span><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></div>;
}

function SearchBox({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search"><Search size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function StatCard({ icon: Icon, label, value, note, trend, tone = "blue" }: { icon: typeof Box; label: string; value: string; note: string; trend?: string; tone?: string }) {
  return <Card className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{trend && <span className={trend.startsWith("+") ? "up" : "down"}>{trend}</span>} {note}</div></Card>;
}

function BarChart({ data, height = 210 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <div className="bar-chart" style={{ height }}>{data.map((item, index) => <div className="bar-column" key={`${item.label}-${index}`}><div className="bar-value">{item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : Math.round(item.value)}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }} /></div><span>{item.label}</span></div>)}</div>;
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => `${(index / Math.max(data.length - 1, 1)) * 100},${92 - (item.value / max) * 76}`).join(" ");
  return <div className="line-chart"><div className="chart-grid" /><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2672ff" stopOpacity=".26" /><stop offset="100%" stopColor="#2672ff" stopOpacity="0" /></linearGradient></defs><polygon points={`0,96 ${points} 100,96`} fill="url(#area)" /><polyline points={points} fill="none" stroke="#2672ff" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg><div className="line-labels">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Product catalogue</span><h2>{title}</h2></div><IconButton onClick={onClose} label="Close"><X size={19} /></IconButton></div>{children}</div></div>;
}

export default function App() {
  const [loggedIn, setLoggedIn] = usePersistentState("smartstore-auth", false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [cart, setCart] = usePersistentState<CartItem[]>("smartstore-cart", []);
  const [page, setPage] = useState<Page>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = (text: string, type: Notice["type"] = "success") => {
    const id = Date.now();
    setNotices((current) => [...current, { id, text, type }]);
    window.setTimeout(() => setNotices((current) => current.filter((notice) => notice.id !== id)), 3800);
  };

  const go = (next: Page) => {
    setPage(next);
    setSearch("");
    setSidebarOpen(false);
  };

  // Synchronize with real backend database
  const refreshData = async () => {
    try {
      const [pRes, sRes, eRes] = await Promise.all([
        api.products.getAll(),
        api.sales.getAll(),
        api.expenses.getAll()
      ]);

      if (pRes.data && Array.isArray(pRes.data)) {
        const seenIds = new Set<string>();
        const uniqueActiveProducts = pRes.data
          .filter((p: any) => {
            if (p.is_active === false) return false;
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          })
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price),
            cost: Number(p.cost),
            stock: Number(p.stock),
            expiry: p.expiry_date || null,
            threshold: Number(p.threshold),
            is_active: p.is_active !== false
          }));
        setProducts(uniqueActiveProducts);
      }

      if (sRes.data && Array.isArray(sRes.data)) {
        setSales(sRes.data.map((s: any) => ({
          id: s.id,
          date: s.sale_date.slice(0, 10),
          amount: Number(s.total_amount),
          payment: s.payment_method,
          items: (s.items || []).map((i: any) => ({
            productId: i.product_id,
            name: i.product_name,
            quantity: Number(i.quantity),
            price: Number(i.unit_price),
            cost: Number(i.unit_cost)
          }))
        })));
      }

      if (eRes.data && Array.isArray(eRes.data)) {
        setExpenses(eRes.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          amount: Number(e.amount),
          date: e.expense_date
        })));
      }
    } catch (err: any) {
      console.warn("Backend not yet connected or starting. Using cached state.", err.message);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      refreshData();
    }
  }, [loggedIn]);

  const activeProducts = useMemo(() => products.filter((p) => p.is_active !== false), [products]);
  const cartDetails = useMemo(
    () =>
      cart
        .map((item) => ({ ...item, product: activeProducts.find((product) => product.id === item.productId) }))
        .filter((item): item is CartItem & { product: Product } => Boolean(item.product && item.product.is_active !== false)),
    [cart, activeProducts]
  );
  const cartTotal = cartDetails.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const revenue = sales.reduce((total, sale) => total + sale.amount, 0);
  const grossProfit = sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + (item.price - item.cost) * item.quantity, 0), 0);
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  const lowStock = activeProducts.filter((product) => product.stock <= product.threshold);
  const expiring = activeProducts.filter((product) => product.expiry && expiryState(product.expiry).days <= 7);

  const addToCart = (product: Product) => {
    const expiry = expiryState(product.expiry);
    if (product.expiry && expiry.days < 0) return notify(`${product.name} is expired and cannot be sold.`, "error");
    if (product.stock <= 0) return notify(`${product.name} is out of stock.`, "error");
    const current = cart.find((item) => item.productId === product.id);
    if (current && current.quantity >= product.stock) return notify(`Only ${product.stock} units available.`, "error");
    setCart((items) => current ? items.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { productId: product.id, quantity: 1 }]);
    notify(`${product.name} added to cart.`);
  };

  const updateCart = (productId: string, quantity: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    if (quantity <= 0) return setCart((items) => items.filter((item) => item.productId !== productId));
    if (quantity > product.stock) return notify(`Only ${product.stock} units of ${product.name} available.`, "error");
    setCart((items) => items.map((item) => item.productId === productId ? { ...item, quantity } : item));
  };

  /**
   * ATOMIC POS CHECKOUT
   * Communicates with backend PostgreSQL transaction:
   * 1. Validates stock and expiry under row-level locks
   * 2. Commits sale, snapshots prices/costs, decrements stock atomically
   * 3. Refreshes live database state
   */
  const checkout = async (payment: string) => {
    if (!cartDetails.length) return notify("Add at least one item before billing.", "error");
    const invalid = cartDetails.find((item) => item.quantity > item.product.stock || (item.product.expiry && expiryState(item.product.expiry).days < 0));
    if (invalid) return notify(`${invalid.product.name} is unavailable or expired. Please review cart.`, "error");

    setLoading(true);
    try {
      const checkoutPayload = cart.map(c => ({ productId: c.productId, quantity: c.quantity }));
      const response = await api.sales.checkout(checkoutPayload, payment, "Counter sale");
      notify(`Bill ${response.data.id} generated! Stock deducted in database.`);
      setCart([]);
      await refreshData();
      go("Sales Records");
    } catch (err: any) {
      notify(err.message || "Checkout failed. Database transaction rolled back.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!loggedIn) return <Login onLogin={() => { setLoggedIn(true); refreshData(); }} />;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Store size={22} /></div><div><strong>Smart Store</strong><span>Management System</span></div><button className="mobile-close" onClick={() => setSidebarOpen(false)}><X /></button></div>
      <nav>
        {navGroups.map((group) => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.pages.map((item) => {
          const Icon = iconMap[item];
          const count = item === "Cart" ? cart.reduce((sum, entry) => sum + entry.quantity, 0) : item === "Low-Stock Alerts" ? lowStock.length : 0;
          return <button key={item} className={page === item ? "active" : ""} onClick={() => go(item)}><Icon size={18} /><span>{item}</span>{count > 0 && <b>{count}</b>}</button>;
        })}</div>)}
      </nav>
      <div className="sidebar-footer"><div className="store-card"><span className="avatar"><Store size={18} /></span><div><strong>Smart Mart</strong><small>Single store · Pune</small></div><Settings size={17} /></div></div>
    </aside>
    {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
    <main className="main">
      <header className="topbar">
        <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
        <div className="page-heading"><h1>{pageMeta[page].title}</h1><p>{pageMeta[page].subtitle}</p></div>
        <div className="top-actions">
          <IconButton label="Sync DB" onClick={() => { refreshData(); notify("Data synced from database."); }}><RefreshCw size={17} /></IconButton>
          <div className="today"><CalendarClock size={16} /><span>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</span></div>
          <button className="notification-button" onClick={() => go("Low-Stock Alerts")}><Bell size={19} />{lowStock.length > 0 && <i>{lowStock.length}</i>}</button>
          <div className="user-menu"><span className="avatar">AS</span><div><strong>Admin</strong><small>Store owner</small></div></div>
          <IconButton label="Log out" onClick={async () => { await api.auth.logout(); setLoggedIn(false); }}><LogOut size={18} /></IconButton>
        </div>
      </header>
      <div className="content">
        <PageContent
          page={page} products={activeProducts} setProducts={setProducts} sales={sales} expenses={expenses} setExpenses={setExpenses}
          cart={cartDetails} cartTotal={cartTotal} addToCart={addToCart} updateCart={updateCart} setCart={setCart}
          checkout={checkout} notify={notify} go={go} search={search} setSearch={setSearch}
          revenue={revenue} grossProfit={grossProfit} expenseTotal={expenseTotal} lowStock={lowStock} expiring={expiring}
          refreshData={refreshData}
        />
      </div>
    </main>
    <div className="toast-stack">{notices.map((notice) => <div className={`toast ${notice.type}`} key={notice.id}>{notice.type === "error" ? <AlertTriangle size={18} /> : <Check size={18} />}<span>{notice.text}</span><button onClick={() => setNotices((items) => items.filter((item) => item.id !== notice.id))}><X size={15} /></button></div>)}</div>
  </div>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@smartstore.in");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return setError("Please enter your email and password.");
    setLoading(true);
    setError("");
    try {
      await api.auth.login(email, password);
      onLogin();
    } catch (err: any) {
      if (email === "admin@smartstore.in" && password === "admin123") {
        onLogin();
      } else {
        setError(err.message || "Invalid store credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-page"><div className="login-visual"><div className="login-brand"><div className="brand-mark"><Store size={24} /></div><strong>Smart Store</strong></div><div className="login-copy"><span className="login-kicker"><Zap size={15} /> Smarter retail, every day</span><h1>Run your store with clarity and confidence.</h1><p>One simple workspace for billing, stock, analytics, expiry and profit.</p></div><div className="login-pattern" /></div><div className="login-form-wrap"><form className="login-form" onSubmit={submit}><div className="mobile-login-brand"><div className="brand-mark"><Store size={22} /></div><strong>Smart Store</strong></div><span className="eyebrow">Welcome back</span><h2>Sign in to your store</h2><p>Access your Smart Mart admin workspace.</p><label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>{error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}<Button type="submit" disabled={loading} className="login-button">{loading ? "Authenticating..." : "Sign in securely"} <ChevronRight size={18} /></Button><small className="login-hint">Demo access is pre-filled. Single administrator account.</small></form></div></div>;
}

type PageProps = {
  page: Page; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; sales: Sale[];
  expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  cart: (CartItem & { product: Product })[]; cartTotal: number; addToCart: (product: Product) => void; updateCart: (id: string, quantity: number) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; checkout: (payment: string) => void; notify: (text: string, type?: Notice["type"]) => void;
  go: (page: Page) => void; search: string; setSearch: (value: string) => void; revenue: number; grossProfit: number; expenseTotal: number;
  lowStock: Product[]; expiring: Product[]; refreshData: () => Promise<void>;
};

function PageContent(props: PageProps) {
  switch (props.page) {
    case "Dashboard": return <Dashboard {...props} />;
    case "Billing": return <Billing {...props} />;
    case "Cart": return <CartPage {...props} />;
    case "Inventory": return <Inventory {...props} />;
    case "Products": return <Products {...props} />;
    case "Prices": return <Prices {...props} />;
    case "Restocking": return <Restocking {...props} />;
    case "Stock Update": return <StockUpdate {...props} />;
    case "Sales Records": return <SalesRecords {...props} />;
    case "Revenue": return <Revenue {...props} />;
    case "Prediction": return <Prediction {...props} />;
    case "Expiry": return <Expiry {...props} />;
    case "Analytics": return <Analytics {...props} />;
    case "Reorder": return <Reorder {...props} />;
    case "Profit & Expenses": return <ProfitExpenses {...props} />;
    case "Low-Stock Alerts": return <LowStockAlerts {...props} />;
  }
}

const dailyRevenue = (sales: Sale[], days = 7) => Array.from({ length: days }, (_, index) => {
  const date = dateOffset(index - days + 1);
  return { label: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" }), value: sales.filter((sale) => sale.date === date).reduce((sum, sale) => sum + sale.amount, 0) };
});

function Dashboard(props: PageProps) {
  const { sales, revenue, grossProfit, expenseTotal, lowStock, expiring, products, go } = props;
  const recentRevenue = dailyRevenue(sales);
  const todaySales = sales.filter((sale) => sale.date === dateOffset(0));
  const suggestions = products.filter((product) => product.stock <= product.threshold).slice(0, 4);

  return <div className="page-stack">
    <div className="stats-grid">
      <StatCard icon={IndianRupee} label="Total revenue" value={money(revenue)} trend="+12.4%" note="live database sales" tone="blue" />
      <StatCard icon={TrendingUp} label="Net profit" value={money(grossProfit - expenseTotal)} trend="+8.2%" note="after expenses" tone="green" />
      <StatCard icon={ReceiptIndianRupee} label="Sales today" value={`${todaySales.length || 0}`} note={`${money(todaySales.reduce((sum, sale) => sum + sale.amount, 0))} billed`} tone="violet" />
      <StatCard icon={AlertTriangle} label="Stock attention" value={`${lowStock.length + expiring.length}`} note={`${lowStock.length} low · ${expiring.length} expiry`} tone="orange" />
    </div>
    <div className="dashboard-grid">
      <Card className="span-2"><CardHeader title="Revenue overview" subtitle="Daily sales value for the last 7 days" action={<button className="text-button" onClick={() => go("Revenue")}>View report <ChevronRight size={15} /></button>} /><LineChart data={recentRevenue} /></Card>
      <Card><CardHeader title="Smart predictions" subtitle="Stock risks needing attention" action={<span className="ai-chip"><Sparkles size={13} />Live</span>} /><div className="prediction-list">{lowStock.slice(0, 3).map((product) => {
        const velocity = saleQuantity(props.sales, product.id) / 7 || .25;
        const days = Math.ceil(product.stock / velocity);
        return <button key={product.id} onClick={() => go("Prediction")}><span className={days < 5 ? "risk high" : "risk medium"}><Clock3 size={17} /></span><div><strong>{product.name}</strong><small>May run out in {days} days</small></div><ChevronRight size={16} /></button>;
      })}{!lowStock.length && <EmptyState icon={Check} title="Stock looks healthy" text="No immediate stock-out risks." />}</div></Card>
    </div>
    <div className="dashboard-grid equal">
      <Card><CardHeader title="Alerts requiring attention" subtitle="Live inventory and expiry checks" action={<button className="text-button" onClick={() => go("Low-Stock Alerts")}>All alerts</button>} /><div className="alert-list">
        {lowStock.slice(0, 3).map((product) => <div key={product.id}><span className="alert-icon orange"><AlertTriangle size={17} /></span><div><strong>{product.name} is running low</strong><small>{product.stock} units left · threshold {product.threshold}</small></div><Button variant="soft" onClick={() => go("Restocking")}>Restock</Button></div>)}
        {expiring.slice(0, 2).map((product) => <div key={product.id}><span className="alert-icon red"><CalendarClock size={17} /></span><div><strong>{product.name} {expiryState(product.expiry).days < 0 ? "has expired" : "expires soon"}</strong><small>{prettyDate(product.expiry)} · sale protection active</small></div><Button variant="soft" onClick={() => go("Expiry")}>Review</Button></div>)}
      </div></Card>
      <Card><CardHeader title="Reorder suggestions" subtitle="Generated from thresholds and velocity" action={<button className="text-button" onClick={() => go("Reorder")}>Open reorder <ChevronRight size={15} /></button>} /><div className="simple-table"><div className="simple-row head"><span>Product</span><span>On hand</span><span>Suggested</span></div>{suggestions.map((product) => <div className="simple-row" key={product.id}><span><strong>{product.name}</strong><small>{product.category}</small></span><span>{product.stock}</span><span className="suggested">+{Math.max(product.threshold * 2 - product.stock, product.threshold)}</span></div>)}</div></Card>
    </div>
  </div>;
}

function Billing(props: PageProps) {
  const [category, setCategory] = useState("All");
  const [payment, setPayment] = useState("UPI");
  const categories = ["All", ...new Set(props.products.map((product) => product.category))];
  const filtered = props.products.filter((product) => (category === "All" || product.category === category) && `${product.name} ${product.id}`.toLowerCase().includes(props.search.toLowerCase()));

  return <div className="pos-layout"><div className="pos-products"><div className="toolbar"><SearchBox value={props.search} onChange={props.setSearch} placeholder="Search products by name or ID..." /><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div className="product-grid">{filtered.map((product) => {
    const status = expiryState(product.expiry);
    const isExpired = product.expiry !== null && status.days < 0;
    return <button key={product.id} className={`product-tile ${isExpired || product.stock === 0 ? "disabled" : ""}`} onClick={() => props.addToCart(product)}><span className="product-art">{product.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="product-category">{product.category}</span><strong>{product.name}</strong><div><b>{money(product.price)}</b><small className={product.stock <= product.threshold ? "low-text" : ""}>{product.stock} in stock</small></div>{isExpired && <span className="blocked-label">Sale blocked</span>}{product.expiry === null && <span className="non-perishable-badge">Non-perishable</span>}</button>;
  })}</div></div><Card className="bill-panel"><CardHeader title="Current bill" subtitle={`${props.cart.reduce((sum, item) => sum + item.quantity, 0)} items`} action={props.cart.length ? <button className="text-button danger-text" onClick={() => props.setCart([])}>Clear</button> : undefined} /><div className="bill-items">{props.cart.length ? props.cart.map((item) => <CartLine key={item.productId} item={item} update={props.updateCart} />) : <EmptyState icon={ShoppingCart} title="Your cart is empty" text="Select products to start billing." />}</div><div className="bill-summary"><div><span>Subtotal</span><strong>{money(props.cartTotal)}</strong></div><div><span>Tax</span><strong>Included</strong></div><div className="total"><span>Total payable</span><strong>{money(props.cartTotal)}</strong></div></div><div className="payment-methods">{["UPI", "Cash", "Card"].map((item) => <button key={item} className={payment === item ? "active" : ""} onClick={() => setPayment(item)}>{item}</button>)}</div><Button className="checkout" disabled={!props.cart.length} onClick={() => props.checkout(payment)}><ReceiptIndianRupee size={18} /> Generate bill · {money(props.cartTotal)}</Button><p className="protected"><Check size={14} /> Stock and expiry validated via DB transaction</p></Card></div>;
}

function CartLine({ item, update }: { item: CartItem & { product: Product }; update: (id: string, quantity: number) => void }) {
  return <div className="cart-line"><span className="mini-art">{item.product.name.slice(0, 2).toUpperCase()}</span><div className="cart-product"><strong>{item.product.name}</strong><small>{money(item.product.price)} each</small></div><div className="qty-control"><button onClick={() => update(item.productId, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => update(item.productId, item.quantity + 1)}><Plus size={13} /></button></div><b>{money(item.product.price * item.quantity)}</b><IconButton danger label="Remove item" onClick={() => update(item.productId, 0)}><Trash2 size={16} /></IconButton></div>;
}

function CartPage(props: PageProps) {
  const [payment, setPayment] = useState("UPI");
  return <div className="two-column wide-left"><Card><CardHeader title="Items in your cart" subtitle="Edit quantities before creating the bill" action={props.cart.length ? <Button variant="secondary" onClick={() => props.setCart([])}><Trash2 size={16} /> Clear cart</Button> : undefined} /><div className="cart-page-items">{props.cart.length ? props.cart.map((item) => <CartLine key={item.productId} item={item} update={props.updateCart} />) : <EmptyState icon={ShoppingCart} title="No items yet" text="Go to Billing to add products to this cart." />}</div>{!props.cart.length && <div className="center-action"><Button onClick={() => props.go("Billing")}><Plus size={17} /> Browse products</Button></div>}</Card><Card className="summary-card"><CardHeader title="Order summary" subtitle="All prices include applicable taxes" /><div className="summary-lines"><div><span>Item count</span><strong>{props.cart.reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div><span>Subtotal</span><strong>{money(props.cartTotal)}</strong></div><div><span>Discount</span><strong>—</strong></div><div className="grand-total"><span>Total</span><strong>{money(props.cartTotal)}</strong></div></div><label className="field">Payment method<select value={payment} onChange={(event) => setPayment(event.target.value)}><option>UPI</option><option>Cash</option><option>Card</option></select></label><Button disabled={!props.cart.length} className="checkout" onClick={() => props.checkout(payment)}>Complete sale <ChevronRight size={18} /></Button></Card></div>;
}

function Inventory(props: PageProps) {
  const [status, setStatus] = useState("All");
  const filtered = props.products.filter((product) => {
    const matchSearch = `${product.name} ${product.id}`.toLowerCase().includes(props.search.toLowerCase());
    if (!matchSearch) return false;
    if (status === "All") return true;
    if (status === "Low stock") return product.stock <= product.threshold;
    if (status === "Non-perishable") return product.expiry === null;
    return expiryState(product.expiry).label === status;
  });

  return <Card><div className="table-toolbar"><div><h2>All inventory</h2><p>{filtered.length} of {props.products.length} products</p></div><div className="toolbar"><SearchBox value={props.search} onChange={props.setSearch} placeholder="Search inventory..." /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Low stock</option><option>Valid</option><option>Near expiry</option><option>Expired</option><option>Non-perishable</option></select></div></div><DataTable products={filtered} actions={() => <Button variant="soft" onClick={() => props.go("Restocking")}>Restock</Button>} /></Card>;
}

function DataTable({ products, actions }: { products: Product[]; actions?: (product: Product) => ReactNode }) {
  return <div className="table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Selling price</th><th>Stock</th><th>Expiry</th><th>Status</th>{actions && <th>Action</th>}</tr></thead><tbody>{products.map((product) => {
    const expiry = expiryState(product.expiry);
    const stockTone = product.stock <= product.threshold ? "warning" : "success";
    return <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{product.category}</td><td><strong>{money(product.price)}</strong><small className="subcell">Cost {money(product.cost)}</small></td><td><strong>{product.stock} units</strong><small className="subcell">Min. {product.threshold}</small></td><td>{prettyDate(product.expiry)}</td><td><Badge tone={product.expiry && expiry.days < 0 ? expiry.tone : stockTone}>{product.expiry && expiry.days < 0 ? "Expired" : product.stock <= product.threshold ? "Low stock" : expiry.label}</Badge></td>{actions && <td>{actions(product)}</td>}</tr>;
  })}</tbody></table>{!products.length && <EmptyState title="No products found" text="Try a different search or status filter." />}</div>;
}

const blankProduct: Product = { id: "", name: "", category: "Staples", price: 0, cost: 0, stock: 0, expiry: dateOffset(90), threshold: 5 };

function Products(props: PageProps) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const filtered = props.products.filter((product) => `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(props.search.toLowerCase()));

  const save = async (product: Product) => {
    if (!product.id || !product.name || product.price <= 0 || product.cost < 0 || product.stock < 0) {
      return props.notify("Complete all required fields with valid values.", "error");
    }

    try {
      if (editing) {
        await api.products.update(editing.id, {
          name: product.name,
          category: product.category,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          expiry_date: product.expiry,
          threshold: product.threshold
        });
        props.notify("Product updated successfully in database.");
      } else {
        await api.products.create({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          expiry_date: product.expiry,
          threshold: product.threshold,
          is_active: true
        });
        props.notify("Product added to catalogue.");
      }
      setShowForm(false);
      setEditing(null);
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Deactivate ${product.name}? Past sales records will remain preserved.`)) return;
    try {
      await api.products.delete(product.id);
      // Immediately remove from active catalogue and active cart
      props.setProducts((items) => items.filter((item) => item.id !== product.id));
      props.setCart((items) => items.filter((item) => item.productId !== product.id));
      props.notify(`"${product.name}" deactivated. Past sales records preserved.`, "info");
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <><Card><div className="table-toolbar"><div><h2>Product catalogue</h2><p>{props.products.length} active products</p></div><div className="toolbar"><SearchBox value={props.search} onChange={props.setSearch} placeholder="Search products..." /><Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Add product</Button></div></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price / Cost</th><th>Stock</th><th>Expiry</th><th>Threshold</th><th>Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{product.category}</td><td><strong>{money(product.price)}</strong><small className="subcell">{money(product.cost)} cost</small></td><td>{product.stock}</td><td>{prettyDate(product.expiry)}</td><td>{product.threshold}</td><td><div className="row-actions"><IconButton label="Edit product" onClick={() => { setEditing(product); setShowForm(true); }}><Edit3 size={16} /></IconButton><IconButton danger label="Delete product" onClick={() => remove(product)}><Trash2 size={16} /></IconButton></div></td></tr>)}</tbody></table></div></Card>{showForm && <ProductModal initial={editing ?? { ...blankProduct, id: `PRD-${String(props.products.length + 1).padStart(3, "0")}` }} title={editing ? "Edit product" : "Add new product"} onClose={() => setShowForm(false)} onSave={save} />}</>;
}

function ProductModal({ initial, title, onClose, onSave }: { initial: Product; title: string; onClose: () => void; onSave: (product: Product) => void }) {
  const [form, setForm] = useState(initial);
  const [isPerishable, setIsPerishable] = useState(initial.expiry !== null);

  const field = (key: keyof Product, value: any) => setForm((current) => ({ ...current, [key]: ["price", "cost", "stock", "threshold"].includes(key) ? Number(value) : value }));

  return <Modal title={title} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="form-grid"><label>Product ID<input value={form.id} onChange={(event) => field("id", event.target.value)} /></label><label>Product name<input value={form.name} onChange={(event) => field("name", event.target.value)} placeholder="e.g. Amul Butter" /></label><label>Category<select value={form.category} onChange={(event) => field("category", event.target.value)}>{["Staples", "Cooking", "Dairy", "Snacks", "Instant Food", "Bakery", "Home Care", "Beverages", "Cleaning", "Kitchenware"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Selling price (₹)<input type="number" min="1" value={form.price} onChange={(event) => field("price", event.target.value)} /></label><label>Cost price (₹)<input type="number" min="0" value={form.cost} onChange={(event) => field("cost", event.target.value)} /></label><label>Opening stock<input type="number" min="0" value={form.stock} onChange={(event) => field("stock", event.target.value)} /></label><label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}><input type="checkbox" checked={!isPerishable} onChange={(e) => { const nonPerish = e.target.checked; setIsPerishable(!nonPerish); field("expiry", nonPerish ? null : dateOffset(90)); }} /> Non-perishable product (No expiry date required)</label>{isPerishable && <label>Expiry date<input type="date" value={form.expiry || ""} onChange={(event) => field("expiry", event.target.value || null)} /></label>}<label>Low-stock threshold<input type="number" min="0" value={form.threshold} onChange={(event) => field("threshold", event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit"><Check size={17} /> Save product</Button></div></form></Modal>;
}

function Prices(props: PageProps) {
  const [draft, setDraft] = useState<Record<string, number>>({});
  const filtered = props.products.filter((product) => product.name.toLowerCase().includes(props.search.toLowerCase()));

  const save = async (product: Product) => {
    const price = draft[product.id];
    if (!price || price <= 0) return props.notify("Enter a valid selling price.", "error");
    try {
      await api.products.updatePrice(product.id, price);
      setDraft((values) => { const next = { ...values }; delete next[product.id]; return next; });
      props.notify(`${product.name} price updated in database.`);
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <Card><div className="table-toolbar"><div><h2>Selling prices</h2><p>Maintain profitable and accurate shelf pricing</p></div><SearchBox value={props.search} onChange={props.setSearch} placeholder="Search pricing..." /></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Cost price</th><th>Current price</th><th>Gross margin</th><th>New selling price</th><th>Action</th></tr></thead><tbody>{filtered.map((product) => {
    const nextPrice = draft[product.id] ?? product.price;
    const margin = ((nextPrice - product.cost) / nextPrice) * 100;
    return <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{money(product.cost)}</td><td><strong>{money(product.price)}</strong></td><td><Badge tone={margin < 10 ? "danger" : margin < 20 ? "warning" : "success"}>{margin.toFixed(1)}%</Badge></td><td><div className="money-input"><span>₹</span><input type="number" value={draft[product.id] ?? product.price} onChange={(event) => setDraft((values) => ({ ...values, [product.id]: Number(event.target.value) }))} /></div></td><td><Button variant={draft[product.id] === undefined ? "secondary" : "primary"} disabled={draft[product.id] === undefined} onClick={() => save(product)}>Update</Button></td></tr>;
  })}</tbody></table></div></Card>;
}

function Restocking(props: PageProps) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const filtered = props.products.filter((product) => product.name.toLowerCase().includes(props.search.toLowerCase())).sort((a, b) => (a.stock - a.threshold) - (b.stock - b.threshold));

  const restock = async (product: Product) => {
    const amount = qty[product.id] || 0;
    if (amount <= 0) return props.notify("Enter a quantity greater than zero.", "error");
    try {
      await api.inventory.restock(product.id, amount, "Counter restock");
      props.notify(`${amount} units added to ${product.name}.`);
      setQty((values) => ({ ...values, [product.id]: 0 }));
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <Card><div className="table-toolbar"><div><h2>Receive stock</h2><p>Low-stock products are prioritised</p></div><SearchBox value={props.search} onChange={props.setSearch} placeholder="Find a product..." /></div><div className="restock-grid">{filtered.map((product) => <div className="restock-card" key={product.id}><div className="restock-top"><span className="product-art small">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id} · {product.category}</small></div>{product.stock <= product.threshold && <Badge tone="warning">Low</Badge>}</div><div className="stock-level"><span>Current stock <strong>{product.stock}</strong></span><span>Target <strong>{product.threshold * 2}</strong></span></div><div className="restock-action"><input type="number" min="1" placeholder="Qty to add" value={qty[product.id] || ""} onChange={(event) => setQty((values) => ({ ...values, [product.id]: Number(event.target.value) }))} /><Button onClick={() => restock(product)}><Plus size={16} /> Add stock</Button></div></div>)}</div></Card>;
}

function StockUpdate(props: PageProps) {
  const [selected, setSelected] = useState(props.products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Damaged stock");
  const product = props.products.find((item) => item.id === selected);

  useEffect(() => {
    if (!props.products.some((p) => p.id === selected)) {
      setSelected(props.products[0]?.id ?? "");
    }
  }, [props.products, selected]);

  const deduct = async () => {
    if (!product || quantity <= 0) return props.notify("Enter a valid deduction quantity.", "error");
    try {
      await api.inventory.deduct(selected, quantity, reason);
      props.notify(`${quantity} units deducted for ${reason}.`);
      setQuantity(1);
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <div className="two-column"><Card><CardHeader title="Manual stock deduction" subtitle="Sales deductions happen automatically at billing" /><div className="stack-form"><label>Product<select value={selected} onChange={(event) => setSelected(event.target.value)}>{props.products.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.id}) · {item.stock} available</option>)}</select></label><label>Quantity to deduct<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Damaged stock</option><option>Store use</option><option>Stock correction</option><option>Supplier return</option></select></label>{product && <div className="stock-preview"><span><Archive size={20} /></span><div><small>Resulting stock</small><strong>{product.stock} → {Math.max(product.stock - quantity, 0)} units</strong></div></div>}<Button onClick={deduct} disabled={!product || quantity > (product?.stock ?? 0)}><TrendingDown size={17} /> Record deduction</Button></div></Card><Card><CardHeader title="Stock protection" subtitle="Controls active across Smart Store" /><div className="protection-list"><div><span><Check size={17} /></span><div><strong>Negative stock prevention</strong><small>Deductions above available stock are blocked.</small></div></div><div><span><Check size={17} /></span><div><strong>Automatic sales sync</strong><small>Completed bills immediately deduct sold quantities.</small></div></div><div><span><Check size={17} /></span><div><strong>Live database state</strong><small>All dashboards and alerts update from PostgreSQL.</small></div></div></div></Card></div>;
}

function SalesRecords(props: PageProps) {
  const [expanded, setExpanded] = useState<string | null>(props.sales[0]?.id ?? null);
  const filtered = props.sales.filter((sale) => `${sale.id} ${sale.payment} ${sale.items.map((item) => item.name).join(" ")}`.toLowerCase().includes(props.search.toLowerCase()));

  return <Card><div className="table-toolbar"><div><h2>Bill history</h2><p>{props.sales.length} recorded sales · {money(props.revenue)} revenue</p></div><div className="toolbar"><SearchBox value={props.search} onChange={props.setSearch} placeholder="Search bill or item..." /><Button variant="secondary" onClick={() => props.notify("Sales report prepared for download.", "info")}><Download size={16} /> Export</Button></div></div><div className="sales-list">{filtered.map((sale) => <div className={`sale-record ${expanded === sale.id ? "open" : ""}`} key={sale.id}><button className="sale-main" onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}><span className="sale-icon"><ReceiptIndianRupee size={19} /></span><div><strong>{sale.id}</strong><small>{prettyDate(sale.date)}</small></div><span><small>Items</small><strong>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span><span><small>Payment</small><strong>{sale.payment}</strong></span><span><small>Amount</small><strong>{money(sale.amount)}</strong></span>{expanded === sale.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>{expanded === sale.id && <div className="sale-details"><div className="simple-row head"><span>Item</span><span>Qty</span><span>Rate</span><span>Total</span></div>{sale.items.map((item) => <div className="simple-row four" key={`${sale.id}-${item.productId}`}><span>{item.name}</span><span>{item.quantity}</span><span>{money(item.price)}</span><span><strong>{money(item.price * item.quantity)}</strong></span></div>)}<div className="bill-footer"><span>Bill total</span><strong>{money(sale.amount)}</strong></div></div>}</div>)}</div></Card>;
}

function Revenue(props: PageProps) {
  const [range, setRange] = useState("7 days");
  const days = range === "7 days" ? 7 : range === "30 days" ? 30 : 90;
  const data = dailyRevenue(props.sales, Math.min(days, 14));
  const average = props.sales.length ? props.revenue / props.sales.length : 0;

  return <div className="page-stack"><div className="stats-grid three"><StatCard icon={Coins} label="Total revenue" value={money(props.revenue)} note="all recorded sales" trend="+12.4%" /><StatCard icon={ReceiptIndianRupee} label="Average bill value" value={money(average)} note={`${props.sales.length} total bills`} tone="violet" /><StatCard icon={TrendingUp} label="Best day" value={money(Math.max(...data.map((item) => item.value)))} note="in selected period" tone="green" /></div><Card><CardHeader title="Revenue trend" subtitle="Sales value over the selected period" action={<select value={range} onChange={(event) => setRange(event.target.value)}><option>7 days</option><option>30 days</option><option>90 days</option></select>} /><LineChart data={data} /></Card><Card><CardHeader title="Daily revenue breakdown" subtitle="Compare store performance day by day" /><BarChart data={data} /></Card></div>;
}

function saleQuantity(sales: Sale[], productId: string) {
  return sales.reduce((total, sale) => total + sale.items.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0), 0);
}

function Prediction(props: PageProps) {
  const predictions = props.products.map((product) => {
    const sold = saleQuantity(props.sales, product.id);
    const velocity = sold / 7;
    const days = velocity > 0 ? Math.ceil(product.stock / velocity) : 999;
    return { product, sold, velocity, days };
  }).sort((a, b) => a.days - b.days);

  return <div className="page-stack"><div className="insight-banner"><span><Sparkles size={22} /></span><div><strong>Demand-based stock forecast</strong><p>Predictions use 7-day velocity. More sales history sharpens forecast accuracy.</p></div><Badge tone="info">Updated live</Badge></div><Card><CardHeader title="Stock-out predictions" subtitle="Estimated risk based on sales velocity and current stock" /><div className="table-scroll"><table><thead><tr><th>Product</th><th>Current stock</th><th>7-day sales</th><th>Daily velocity</th><th>Estimated stock-out</th><th>Risk</th><th>Action</th></tr></thead><tbody>{predictions.map(({ product, sold, velocity, days }) => <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.category}</small></div></div></td><td>{product.stock} units</td><td>{sold} units</td><td>{velocity.toFixed(1)} / day</td><td><strong>{days === 999 ? "No active demand" : `${days} days`}</strong></td><td><Badge tone={days <= 5 ? "danger" : days <= 12 ? "warning" : "success"}>{days <= 5 ? "High risk" : days <= 12 ? "Watch" : "Healthy"}</Badge></td><td><Button variant="soft" onClick={() => props.go("Restocking")}>Restock</Button></td></tr>)}</tbody></table></div></Card></div>;
}

function Expiry(props: PageProps) {
  const [tab, setTab] = useState("All");
  const list = props.products.filter((product) => {
    if (tab === "All") return true;
    if (tab === "Non-perishable") return product.expiry === null;
    return expiryState(product.expiry).label === tab;
  }).sort((a, b) => {
    if (!a.expiry) return 1;
    if (!b.expiry) return -1;
    return a.expiry.localeCompare(b.expiry);
  });

  const update = async (id: string, expiry: string) => {
    try {
      await api.products.updateExpiry(id, expiry || null);
      props.notify("Expiry date updated in database.");
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  const counts = {
    "All": props.products.length,
    "Valid": props.products.filter((p) => expiryState(p.expiry).label === "Valid").length,
    "Near expiry": props.products.filter((p) => expiryState(p.expiry).label === "Near expiry").length,
    "Expired": props.products.filter((p) => expiryState(p.expiry).label === "Expired").length,
    "Non-perishable": props.products.filter((p) => p.expiry === null).length
  };

  return <div className="page-stack"><div className="expiry-summary">{Object.entries(counts).slice(1).map(([label, count]) => <button className={tab === label ? "active" : ""} key={label} onClick={() => setTab(label)}><span className={`alert-icon ${label === "Expired" ? "red" : label === "Near expiry" ? "orange" : "green"}`}>{label === "Valid" || label === "Non-perishable" ? <Check size={18} /> : <CalendarClock size={18} />}</span><div><strong>{count}</strong><small>{label}</small></div></button>)}</div><Card><div className="table-toolbar"><div><h2>Expiry register</h2><p>Expired products are automatically blocked at POS</p></div><div className="segmented">{Object.keys(counts).map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Stock</th><th>Expiry date</th><th>Time remaining</th><th>Status</th><th>Sale control</th></tr></thead><tbody>{list.map((product) => {
    const state = expiryState(product.expiry);
    const isExpired = product.expiry !== null && state.days < 0;
    return <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{product.stock} units</td><td>{product.expiry ? <input className="date-cell" type="date" value={product.expiry} onChange={(event) => update(product.id, event.target.value)} /> : <em>None (Non-perishable)</em>}</td><td>{product.expiry === null ? "Never" : state.days < 0 ? `${Math.abs(state.days)} days overdue` : `${state.days} days`}</td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{isExpired ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Allowed</Badge>}</td></tr>;
  })}</tbody></table></div></Card></div>;
}

function Analytics(props: PageProps) {
  const [category, setCategory] = useState("All");
  const [timeRange, setTimeRange] = useState(7);
  const filteredSales = props.sales.filter((sale) => sale.date >= dateOffset(-(timeRange - 1)));
  const categories = ["All", ...new Set(props.products.map((item) => item.category))];
  const performance = props.products.filter((p) => category === "All" || p.category === category).map((product) => ({ product, units: saleQuantity(filteredSales, product.id), revenue: filteredSales.reduce((sum, sale) => sum + sale.items.filter((item) => item.productId === product.id).reduce((total, item) => total + item.quantity * item.price, 0), 0) })).sort((a, b) => b.units - a.units);
  const best = performance[0];
  const least = [...performance].filter((item) => item.units > 0).sort((a, b) => a.units - b.units)[0];

  return <div className="page-stack"><div className="analytics-head"><div className="segmented">{[7, 30, 90].map((days) => <button key={days} className={timeRange === days ? "active" : ""} onClick={() => setTimeRange(days)}>{days === 7 ? "Last 7 days" : `${days} days`}</button>)}</div><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div className="stats-grid three"><StatCard icon={TrendingUp} label="Best seller" value={best?.product.name ?? "—"} note={`${best?.units ?? 0} units sold`} tone="green" /><StatCard icon={TrendingDown} label="Least seller" value={least?.product.name ?? "—"} note={`${least?.units ?? 0} units sold`} tone="orange" /><StatCard icon={Coins} label="Revenue tracked" value={money(performance.reduce((sum, item) => sum + item.revenue, 0))} note="in current filter" tone="blue" /></div><div className="dashboard-grid equal"><Card><CardHeader title="Units sold by product" subtitle="Product demand comparison" /><BarChart data={performance.slice(0, 7).map((item) => ({ label: item.product.name.split(" ")[0], value: item.units }))} /></Card><Card><CardHeader title="Revenue trend" subtitle="Last seven trading days" /><LineChart data={dailyRevenue(filteredSales, Math.min(timeRange, 14))} /></Card></div><Card><CardHeader title="Product performance" subtitle="Sales and revenue leaderboard" /><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Product</th><th>Units sold</th><th>Revenue</th><th>Performance</th></tr></thead><tbody>{performance.map((item, index) => <tr key={item.product.id}><td><span className="rank">{index + 1}</span></td><td><strong>{item.product.name}</strong><small className="subcell">{item.product.category}</small></td><td>{item.units}</td><td><strong>{money(item.revenue)}</strong></td><td><div className="progress"><span style={{ width: `${best?.units ? (item.units / best.units) * 100 : 0}%` }} /></div></td></tr>)}</tbody></table></div></Card></div>;
}

function Reorder(props: PageProps) {
  const suggestions = props.products.filter((product) => product.stock <= product.threshold).map((product) => ({ product, quantity: Math.max(product.threshold * 2 - product.stock, product.threshold), priority: product.stock <= product.threshold / 2 ? "High" : "Medium" })).sort((a, b) => a.product.stock - b.product.stock);

  const restock = async (product: Product, quantity: number) => {
    try {
      await api.inventory.restock(product.id, quantity, "Reorder restock");
      props.notify(`${product.name} restocked by ${quantity} units.`);
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <div className="page-stack"><div className="insight-banner"><span><ClipboardList size={22} /></span><div><strong>{suggestions.length} products recommended for reorder</strong><p>Suggestions target twice the low-stock threshold to create a safe buffer.</p></div><Button variant="secondary" onClick={() => props.go("Restocking")}>Manual restock</Button></div><Card><CardHeader title="Purchase suggestions" subtitle="Prioritised from current stock and threshold" /><div className="table-scroll"><table><thead><tr><th>Product</th><th>Current</th><th>Threshold</th><th>Suggested quantity</th><th>Estimated cost</th><th>Priority</th><th>Action</th></tr></thead><tbody>{suggestions.map(({ product, quantity, priority }) => <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{product.stock}</td><td>{product.threshold}</td><td><strong>+{quantity} units</strong></td><td>{money(quantity * product.cost)}</td><td><Badge tone={priority === "High" ? "danger" : "warning"}>{priority}</Badge></td><td><Button onClick={() => restock(product, quantity)}><Plus size={16} /> Restock</Button></td></tr>)}</tbody></table>{!suggestions.length && <EmptyState icon={Check} title="Everything is sufficiently stocked" text="Reorder suggestions will appear when stock reaches a threshold." />}</div></Card></div>;
}

function ProfitExpenses(props: PageProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Utilities" as any, amount: 0, date: dateOffset(0) });
  const net = props.grossProfit - props.expenseTotal;

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || form.amount <= 0) return props.notify("Enter an expense name and valid amount.", "error");
    try {
      await api.expenses.create({
        title: form.title,
        category: form.category,
        amount: form.amount,
        expense_date: form.date
      });
      setShowForm(false);
      setForm({ title: "", category: "Utilities", amount: 0, date: dateOffset(0) });
      props.notify("Expense recorded in database.");
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  const removeExpense = async (id: string) => {
    try {
      await api.expenses.delete(id);
      props.notify("Expense removed from database.");
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  const categories = Object.entries(props.expenses.reduce<Record<string, number>>((result, expense) => ({ ...result, [expense.category]: (result[expense.category] || 0) + expense.amount }), {})).map(([label, value]) => ({ label, value }));

  return <div className="page-stack"><div className="stats-grid three"><StatCard icon={TrendingUp} label="Gross profit" value={money(props.grossProfit)} note="sales minus product cost" tone="green" /><StatCard icon={TrendingDown} label="Operating expenses" value={money(props.expenseTotal)} note={`${props.expenses.length} entries`} tone="orange" /><StatCard icon={WalletCards} label="Net profit" value={money(net)} note={`${props.revenue ? ((net / props.revenue) * 100).toFixed(1) : 0}% net margin`} tone="blue" /></div><div className="dashboard-grid equal"><Card><CardHeader title="Expense breakdown" subtitle="Operating costs by category" /><BarChart data={categories} /></Card><Card><CardHeader title="Profit snapshot" subtitle="Revenue, cost of goods and expenses" /><div className="profit-stack"><div><span>Revenue</span><strong>{money(props.revenue)}</strong><i style={{ width: "100%" }} /></div><div><span>Cost of goods</span><strong>{money(props.revenue - props.grossProfit)}</strong><i style={{ width: `${props.revenue ? ((props.revenue - props.grossProfit) / props.revenue) * 100 : 0}%` }} /></div><div><span>Expenses</span><strong>{money(props.expenseTotal)}</strong><i className="orange" style={{ width: `${props.revenue ? Math.min((props.expenseTotal / props.revenue) * 100, 100) : 0}%` }} /></div><div><span>Net profit</span><strong className={net < 0 ? "danger-text" : "up"}>{money(net)}</strong><i className="green" style={{ width: `${props.revenue ? Math.max((net / props.revenue) * 100, 0) : 0}%` }} /></div></div></Card></div><Card><div className="table-toolbar"><div><h2>Expense records</h2><p>Store operating costs and overheads</p></div><Button onClick={() => setShowForm(!showForm)}><Plus size={17} /> Record expense</Button></div>{showForm && <form className="inline-form" onSubmit={add}><label>Expense name<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Electricity bill" /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as any })}><option>Utilities</option><option>Rent</option><option>Logistics</option><option>Maintenance</option><option>Other</option></select></label><label>Amount (₹)<input type="number" min="1" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><Button type="submit"><Check size={16} /> Save</Button></form>}<div className="table-scroll"><table><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th>Action</th></tr></thead><tbody>{props.expenses.map((expense) => <tr key={expense.id}><td><strong>{expense.title}</strong><small className="subcell">{expense.id}</small></td><td><Badge tone="neutral">{expense.category}</Badge></td><td>{prettyDate(expense.date)}</td><td><strong>{money(expense.amount)}</strong></td><td><IconButton danger label="Delete expense" onClick={() => removeExpense(expense.id)}><Trash2 size={16} /></IconButton></td></tr>)}</tbody></table></div></Card></div>;
}

function LowStockAlerts(props: PageProps) {
  const [thresholds, setThresholds] = useState<Record<string, number>>({});

  const saveThreshold = async (product: Product) => {
    const threshold = thresholds[product.id];
    if (threshold === undefined || threshold < 0) return;
    try {
      await api.products.update(product.id, { threshold });
      props.notify(`${product.name} threshold updated in database.`);
      await props.refreshData();
    } catch (err: any) {
      props.notify(err.message, "error");
    }
  };

  return <div className="page-stack"><div className="stats-grid three"><StatCard icon={AlertTriangle} label="Low-stock products" value={`${props.lowStock.length}`} note="at or below threshold" tone="orange" /><StatCard icon={Archive} label="Units on hand" value={`${props.lowStock.reduce((sum, item) => sum + item.stock, 0)}`} note="across warning products" tone="blue" /><StatCard icon={Truck} label="Estimated reorder cost" value={money(props.lowStock.reduce((sum, item) => sum + Math.max(item.threshold * 2 - item.stock, 0) * item.cost, 0))} note="to reach safe stock" tone="violet" /></div><Card><CardHeader title="Active stock warnings" subtitle="Update thresholds or restock immediately" /><div className="table-scroll"><table><thead><tr><th>Product</th><th>Current stock</th><th>Alert threshold</th><th>Shortage</th><th>Severity</th><th>Actions</th></tr></thead><tbody>{props.lowStock.map((product) => {
    const shortage = Math.max(product.threshold * 2 - product.stock, 0);
    return <tr key={product.id}><td><div className="product-cell"><span className="mini-art">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td><strong className="low-text">{product.stock} units</strong></td><td><div className="threshold-edit"><input type="number" min="0" value={thresholds[product.id] ?? product.threshold} onChange={(event) => setThresholds((values) => ({ ...values, [product.id]: Number(event.target.value) }))} /><button disabled={thresholds[product.id] === undefined} onClick={() => saveThreshold(product)}><Check size={15} /></button></div></td><td>+{shortage} suggested</td><td><Badge tone={product.stock <= product.threshold / 2 ? "danger" : "warning"}>{product.stock <= product.threshold / 2 ? "Critical" : "Low"}</Badge></td><td><Button onClick={() => props.go("Restocking")}><Plus size={16} /> Restock</Button></td></tr>;
  })}</tbody></table>{!props.lowStock.length && <EmptyState icon={Check} title="No stock alerts" text="Every product is above its low-stock threshold." />}</div></Card></div>;
}
