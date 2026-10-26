import fs from 'fs';
import path from 'path';
import {
  Product,
  Deal,
  Category,
  BusinessSettings,
  DiningTable,
  Order,
  OrderItemRecord,
  OrderStatus,
  OrderType,
  CustomerCreditPayment,
  CustomerLead,
  DailyExpense,
} from '@/types';
import {
  initialProducts,
  initialDeals,
  initialCategories,
  initialBusinessSettings,
  initialDiningTables,
} from './initialData';

export interface StoredAdminCredentials {
  username: string;
  salt: string;
  passwordHash: string;
  sessionVersion: string;
}

interface DatabaseSchema {
  dealMenuVersion?: number;
  dailySales?: Record<
    string,
    {
      total: number;
      orderCount: number;
      closedAt: string;
      orders?: Order[];
      burgerCount?: number;
      shawarmaCount?: number;
      otherItemCount?: number;
      itemBreakdown?: Array<{ name: string; quantity: number; revenue: number; kind: string }>;
    }
  >;
  dailyExpenses?: DailyExpense[];
  monthlyCreditAccounts?: Record<string, { enabled: boolean; updatedAt: string }>;
  creditPayments?: CustomerCreditPayment[];
  products: Product[];
  deals: Deal[];
  categories: Category[];
  settings: BusinessSettings;
  tables: DiningTable[];
  orders: Order[];
  adminCredentials?: StoredAdminCredentials;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'student_shawarma_db.json');

// In-memory store cached across hot reloads in runtime
let memoryCache: DatabaseSchema | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // In serverless environments where root is read-only, memoryCache will handle reads/writes
  }
}

function loadDatabase(): DatabaseSchema {
  if (memoryCache) {
    return memoryCache;
  }

  ensureDataDir();

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const database: DatabaseSchema = JSON.parse(raw);
      memoryCache = database;
      if ((database.dealMenuVersion ?? 0) < 3) {
        const updatedDealIds = new Set([
          'deal-1',
          'deal-2',
          'deal-3',
          'deal-4',
          'deal-5',
          'deal-6',
          'deal-8',
          'deal-9',
          'deal-10',
          'deal-11',
          'deal-12',
          'deal-13',
          'deal-14',
        ]);
        const savedDeals = new Map(database.deals.map((deal) => [deal.id, deal]));
        for (const deal of initialDeals) {
          if (updatedDealIds.has(deal.id)) {
            const savedDeal = savedDeals.get(deal.id);
            savedDeals.set(
              deal.id,
              savedDeal
                ? {
                    ...savedDeal,
                    price: deal.price,
                    originalPriceFormat: deal.originalPriceFormat,
                    descriptionEn: deal.descriptionEn,
                    components: deal.components,
                    isFamilyDeal: deal.isFamilyDeal,
                  }
                : deal
            );
          }
        }
        database.deals = [...savedDeals.values()].sort(
          (a, b) => a.dealNumber - b.dealNumber
        );
        database.dealMenuVersion = 3;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 4) {
        const shawarmaProducts = new Map(
          initialProducts
            .filter((product) => product.categoryId === 'shawarma')
            .map((product) => [product.id, product])
        );
        const existingShawarmaIds = new Set<string>();
        database.products = database.products.flatMap((product) => {
          const updatedProduct = shawarmaProducts.get(product.id);
          if (product.categoryId === 'shawarma' && !updatedProduct) {
            return [];
          }
          if (!updatedProduct) {
            return [product];
          }
          existingShawarmaIds.add(product.id);
          return [{ ...product, ...updatedProduct }];
        });
        for (const [id, product] of shawarmaProducts) {
          if (!existingShawarmaIds.has(id)) {
            database.products.push(product);
          }
        }
        database.dealMenuVersion = 4;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 5) {
        const platterProducts = new Map(
          initialProducts
            .filter((product) => product.categoryId === 'platters-rolls')
            .map((product) => [product.id, product])
        );
        const existingPlatterIds = new Set<string>();
        database.products = database.products.flatMap((product) => {
          const updatedProduct = platterProducts.get(product.id);
          if (product.categoryId === 'platters-rolls' && !updatedProduct) {
            return [];
          }
          if (!updatedProduct) {
            return [product];
          }
          existingPlatterIds.add(product.id);
          return [{ ...product, ...updatedProduct }];
        });
        for (const [id, product] of platterProducts) {
          if (!existingPlatterIds.has(id)) {
            database.products.push(product);
          }
        }
        database.dealMenuVersion = 5;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 6) {
        const savedProducts = new Map(database.products.map((product) => [product.id, product]));
        database.products = initialProducts.map((product) => {
          const savedProduct = savedProducts.get(product.id);
          return savedProduct
            ? {
                ...product,
                image: savedProduct.image,
                isAvailable: savedProduct.isAvailable,
              }
            : product;
        });
        database.categories = [...initialCategories];
        database.settings = {
          ...database.settings,
          address: initialBusinessSettings.address,
          facebookUrl: initialBusinessSettings.facebookUrl,
          openingHoursFormatted: initialBusinessSettings.openingHoursFormatted,
          isSundayOff: false,
          announcementText: initialBusinessSettings.announcementText,
        };
        database.dealMenuVersion = 6;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 7) {
        database.settings = {
          ...database.settings,
          address: initialBusinessSettings.address,
          googleMapsUrl: initialBusinessSettings.googleMapsUrl,
        };
        database.dealMenuVersion = 7;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 8) {
        const productImages = new Map(
          initialProducts.map((product) => [product.id, product.image])
        );
        const dealImages = new Map(initialDeals.map((deal) => [deal.id, deal.image]));
        database.products = database.products.map((product) => {
          const image = productImages.get(product.id);
          return image ? { ...product, image } : product;
        });
        database.deals = database.deals.map((deal) => {
          const image = dealImages.get(deal.id);
          return image ? { ...deal, image } : deal;
        });
        database.dealMenuVersion = 8;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 9) {
        if (database.settings?.restaurantName === 'Student Pizza & Fastfood') {
          database.settings.restaurantName = initialBusinessSettings.restaurantName;
          database.settings.urduName = initialBusinessSettings.urduName;
        }
        database.dealMenuVersion = 9;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 10) {
        database.dailySales ??= {};
        database.orders = database.orders.map((order) =>
          order.status === 'completed' && !order.completedAt
            ? { ...order, completedAt: order.updatedAt }
            : order
        );
        database.dealMenuVersion = 10;
        persistDatabase(database);
      }
      if ((database.dealMenuVersion ?? 0) < 11) {
        database.dailySales ??= {};
        database.dailyExpenses ??= [];
        database.monthlyCreditAccounts ??= {};
        database.creditPayments ??= [];
        database.dealMenuVersion = 11;
        persistDatabase(database);
      }
      if (database.settings?.restaurantName === 'Student Shawarma & Fast Food') {
        database.settings.restaurantName = initialBusinessSettings.restaurantName;
        database.settings.urduName = initialBusinessSettings.urduName;
        persistDatabase(database);
      }
      return database;
    }
  } catch (err) {
    console.warn('Could not read persistent DB file, seeding fresh defaults:', err);
  }

  // Initialize fresh defaults
  memoryCache = {
    dealMenuVersion: 11,
    dailySales: {},
    dailyExpenses: [],
    monthlyCreditAccounts: {},
    creditPayments: [],
    products: [...initialProducts],
    deals: [...initialDeals],
    categories: [...initialCategories],
    settings: { ...initialBusinessSettings },
    tables: [...initialDiningTables],
    orders: [],
  };

  persistDatabase(memoryCache);
  return memoryCache;
}

function persistDatabase(db: DatabaseSchema, requirePersistence = false): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    memoryCache = db;
  } catch (error) {
    if (requirePersistence) {
      throw new Error('Could not persist admin credentials.', { cause: error });
    }
    memoryCache = db;
    // Fail gracefully in read-only environments; memoryCache holds current state
  }
}

export function getStoredAdminCredentials(): StoredAdminCredentials | null {
  return loadDatabase().adminCredentials ?? null;
}

export function getAdminSessionVersion(): string {
  return loadDatabase().adminCredentials?.sessionVersion ?? 'environment-admin-credentials';
}

export function updateStoredAdminCredentials(credentials: StoredAdminCredentials): void {
  const db = loadDatabase();
  const previousCredentials = db.adminCredentials;
  db.adminCredentials = credentials;
  try {
    persistDatabase(db, true);
  } catch (error) {
    db.adminCredentials = previousCredentials;
    throw error;
  }
}

/* =========================================================
   PRODUCTS
========================================================= */

export async function getProducts(): Promise<Product[]> {
  const db = loadDatabase();
  return db.products;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = loadDatabase();
  return db.products.find((p) => p.id === id);
}

export async function upsertProduct(product: Product): Promise<Product> {
  const db = loadDatabase();
  const index = db.products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    db.products[index] = product;
  } else {
    db.products.push(product);
  }
  persistDatabase(db);
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = loadDatabase();
  const initialLen = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length !== initialLen) {
    persistDatabase(db);
    return true;
  }
  return false;
}

/* =========================================================
   DEALS
========================================================= */

export async function getDeals(): Promise<Deal[]> {
  const db = loadDatabase();
  return db.deals;
}

export async function getDealById(id: string): Promise<Deal | undefined> {
  const db = loadDatabase();
  return db.deals.find((d) => d.id === id);
}

export async function upsertDeal(deal: Deal): Promise<Deal> {
  const db = loadDatabase();
  const index = db.deals.findIndex((d) => d.id === deal.id);
  if (index >= 0) {
    db.deals[index] = deal;
  } else {
    db.deals.push(deal);
  }
  persistDatabase(db);
  return deal;
}

export async function deleteDeal(id: string): Promise<boolean> {
  const db = loadDatabase();
  const initialLen = db.deals.length;
  db.deals = db.deals.filter((d) => d.id !== id);
  if (db.deals.length !== initialLen) {
    persistDatabase(db);
    return true;
  }
  return false;
}

/* =========================================================
   CATEGORIES
========================================================= */

export async function getCategories(): Promise<Category[]> {
  const db = loadDatabase();
  return db.categories;
}

/* =========================================================
   BUSINESS SETTINGS
========================================================= */

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const db = loadDatabase();
  return db.settings;
}

export async function updateBusinessSettings(
  updated: Partial<BusinessSettings>
): Promise<BusinessSettings> {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...updated };
  persistDatabase(db);
  return db.settings;
}

/* =========================================================
   DINING TABLES (QR)
========================================================= */

export async function getDiningTables(): Promise<DiningTable[]> {
  const db = loadDatabase();
  return db.tables;
}

export async function getTableById(id: string): Promise<DiningTable | undefined> {
  const db = loadDatabase();
  return db.tables.find((t) => t.id.toLowerCase() === id.toLowerCase());
}

export async function upsertDiningTable(table: DiningTable): Promise<DiningTable> {
  const db = loadDatabase();
  const index = db.tables.findIndex((t) => t.id.toLowerCase() === table.id.toLowerCase());
  if (index >= 0) {
    db.tables[index] = table;
  } else {
    db.tables.push(table);
  }
  persistDatabase(db);
  return table;
}

export async function deleteDiningTable(id: string): Promise<boolean> {
  const db = loadDatabase();
  const initialLen = db.tables.length;
  db.tables = db.tables.filter((t) => t.id.toLowerCase() !== id.toLowerCase());
  if (db.tables.length !== initialLen) {
    persistDatabase(db);
    return true;
  }
  return false;
}

/* =========================================================
   ORDERS & SERVER-SIDE VALIDATION
========================================================= */

export async function getOrders(): Promise<Order[]> {
  const db = loadDatabase();
  // Return orders sorted newest first
  return [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const db = loadDatabase();
  return db.orders.find((o) => o.id === id);
}

const pakistanDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getPakistanDateKey(date: Date): string {
  const parts = Object.fromEntries(
    pakistanDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeCustomerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length >= 12) return `0${digits.slice(-10)}`;
  return digits.length === 10 ? `0${digits}` : digits;
}

function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function getDailyItemSummary(orders: Order[], db: DatabaseSchema) {
  const itemRows = new Map<string, { name: string; quantity: number; revenue: number; kind: string }>();
  let burgerCount = 0;
  let shawarmaCount = 0;
  let otherItemCount = 0;

  const addItem = (name: string, quantity: number, revenue: number, kind: string) => {
    const key = `${kind}:${name}`;
    const existing = itemRows.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.revenue += revenue;
      return;
    }
    itemRows.set(key, { name, quantity, revenue, kind });
  };

  for (const order of orders) {
    for (const item of order.items) {
      if (item.itemType === 'product') {
        const categoryId =
          item.categoryId ?? db.products.find((product) => product.id === item.itemId)?.categoryId ?? '';
        const normalized = `${categoryId} ${item.nameEn}`.toLowerCase();
        if (normalized.includes('shawarma')) {
          shawarmaCount += item.quantity;
        } else if (normalized.includes('burger')) {
          burgerCount += item.quantity;
        } else {
          otherItemCount += item.quantity;
        }
        addItem(item.nameEn, item.quantity, item.subtotal, 'product');
        continue;
      }

      addItem(item.nameEn, item.quantity, item.subtotal, 'deal');
      const components =
        item.components ?? db.deals.find((deal) => deal.id === item.itemId)?.components ?? [];
      for (const component of components) {
        const quantity = component.quantity * item.quantity;
        const componentName = component.nameEn.toLowerCase();
        if (componentName.includes('shawarma')) {
          shawarmaCount += quantity;
        } else if (componentName.includes('burger')) {
          burgerCount += quantity;
        } else {
          otherItemCount += quantity;
        }
      }
    }
  }

  return {
    burgerCount,
    shawarmaCount,
    otherItemCount,
    itemBreakdown: [...itemRows.values()].sort((a, b) => b.quantity - a.quantity),
  };
}

export async function getDailySalesReport(month: string, selectedDate: string) {
  const db = loadDatabase();
  db.dailySales ??= {};
  db.dailyExpenses ??= [];

  const today = getPakistanDateKey(new Date());
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  let ledgerChanged = false;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (date >= today || db.dailySales[date]) continue;

    const completedOrders = db.orders.filter((order) => {
      if (order.status !== 'completed') return false;
      const completedAt = order.completedAt ?? order.updatedAt;
      return getPakistanDateKey(new Date(completedAt)) === date;
    });

    const summary = getDailyItemSummary(completedOrders, db);
    db.dailySales[date] = {
      total: completedOrders.reduce((total, order) => total + order.grandTotal, 0),
      orderCount: completedOrders.length,
      closedAt: new Date().toISOString(),
      orders: JSON.parse(JSON.stringify(completedOrders)) as Order[],
      ...summary,
    };
    ledgerChanged = true;
  }

  const completedOrders = db.orders.filter((order) => order.status === 'completed');
  const dailySales: Record<string, { total: number; orderCount: number; closed: boolean }> = {};
  let selectedOrders: Order[] = [];
  let selectedSummary = getDailyItemSummary([], db);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const closing = db.dailySales[date];
    if (closing) {
      if (!closing.orders) {
        const closingOrders = completedOrders.filter(
          (order) => getPakistanDateKey(new Date(order.completedAt ?? order.updatedAt)) === date
        );
        const summary = getDailyItemSummary(closingOrders, db);
        closing.orders = JSON.parse(JSON.stringify(closingOrders)) as Order[];
        Object.assign(closing, summary);
        ledgerChanged = true;
      }
      dailySales[date] = { total: closing.total, orderCount: closing.orderCount, closed: true };
      if (date === selectedDate) {
        selectedOrders = closing.orders;
        selectedSummary = {
          burgerCount: closing.burgerCount ?? 0,
          shawarmaCount: closing.shawarmaCount ?? 0,
          otherItemCount: closing.otherItemCount ?? 0,
          itemBreakdown: closing.itemBreakdown ?? [],
        };
      }
      continue;
    }
    if (date === today) {
      const todaysOrders = completedOrders.filter((order) =>
        getPakistanDateKey(new Date(order.completedAt ?? order.updatedAt)) === date
      );
      const summary = getDailyItemSummary(todaysOrders, db);
      dailySales[date] = {
        total: todaysOrders.reduce((total, order) => total + order.grandTotal, 0),
        orderCount: todaysOrders.length,
        closed: false,
      };
      if (date === selectedDate) {
        selectedOrders = todaysOrders.sort(
          (a, b) =>
            new Date(b.completedAt ?? b.updatedAt).getTime() -
            new Date(a.completedAt ?? a.updatedAt).getTime()
        );
        selectedSummary = summary;
      }
    }
  }

  if (ledgerChanged) persistDatabase(db);

  const dayOrders = selectedOrders;
  const dailyExpenses = db.dailyExpenses.filter((expense) => expense.date === selectedDate);

  return {
    monthlyTotal: Object.values(dailySales).reduce((total, sales) => total + sales.total, 0),
    monthlyOrderCount: Object.values(dailySales).reduce((total, sales) => total + sales.orderCount, 0),
    dailySales,
    dayOrders,
    dailyExpenses,
    dailyExpenseTotal: dailyExpenses.reduce((total, expense) => total + expense.amount, 0),
    ...selectedSummary,
  };
}

export async function addDailyExpense(
  date: string,
  description: string,
  amount: number
): Promise<DailyExpense> {
  if (!isValidDateKey(date) || date > getPakistanDateKey(new Date())) {
    throw new Error('Choose a valid date that is today or earlier.');
  }
  if (!description.trim() || description.trim().length > 120) {
    throw new Error('Enter a purchase description (up to 120 characters).');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Purchase amount must be greater than zero.');
  }

  const db = loadDatabase();
  db.dailyExpenses ??= [];
  const expense: DailyExpense = {
    id: `EXP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    date,
    description: description.trim(),
    amount: Math.round(amount * 100) / 100,
    createdAt: new Date().toISOString(),
  };
  db.dailyExpenses.push(expense);
  persistDatabase(db);
  return expense;
}

export async function deleteDailyExpense(id: string): Promise<boolean> {
  const db = loadDatabase();
  db.dailyExpenses ??= [];
  const nextExpenses = db.dailyExpenses.filter((expense) => expense.id !== id);
  if (nextExpenses.length === db.dailyExpenses.length) return false;
  db.dailyExpenses = nextExpenses;
  persistDatabase(db);
  return true;
}

export async function getCustomerLeads(month: string): Promise<CustomerLead[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('A valid month is required.');
  const db = loadDatabase();
  db.monthlyCreditAccounts ??= {};
  db.creditPayments ??= [];
  const creditPayments = db.creditPayments;
  const customers = new Map<string, Order[]>();

  for (const order of db.orders) {
    const phone = normalizeCustomerPhone(order.customerPhone);
    const customerOrders = customers.get(phone) ?? [];
    customerOrders.push(order);
    customers.set(phone, customerOrders);
  }

  return [...customers.entries()]
    .map(([phone, orders]) => {
      const completedOrders = orders.filter((order) => order.status === 'completed');
      const customerOrders = orders.filter((order) => order.status !== 'cancelled');
      const thisMonthOrders = customerOrders.filter((order) =>
        getPakistanDateKey(new Date(order.createdAt)).startsWith(`${month}-`)
      );
      const creditOrders = completedOrders.filter((order) => order.paymentMethod === 'monthly_credit');
      const creditSales = creditOrders.reduce((total, order) => total + order.grandTotal, 0);
      const paymentsReceived = creditPayments
        .filter((payment) => normalizeCustomerPhone(payment.phone) === phone)
        .reduce((total, payment) => total + payment.amount, 0);
      const latestOrder = [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        phone,
        name: latestOrder?.customerName ?? phone,
        orderCount: customerOrders.length,
        completedOrderCount: completedOrders.length,
        thisMonthOrderCount: thisMonthOrders.length,
        totalSpent: completedOrders.reduce((total, order) => total + order.grandTotal, 0),
        creditSales,
        paymentsReceived,
        creditBalance: Math.max(0, creditSales - paymentsReceived),
        monthlyCreditEnabled: db.monthlyCreditAccounts?.[phone]?.enabled ?? false,
        lastOrderAt: latestOrder?.createdAt ?? '',
        favourite: thisMonthOrders.length >= 10,
        payments: creditPayments
          .filter((payment) => normalizeCustomerPhone(payment.phone) === phone)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount);
}

export async function setMonthlyCreditAccount(phone: string, enabled: boolean): Promise<void> {
  const key = normalizeCustomerPhone(phone);
  if (key.length < 10) throw new Error('A valid customer phone number is required.');
  const db = loadDatabase();
  db.monthlyCreditAccounts ??= {};
  db.monthlyCreditAccounts[key] = { enabled, updatedAt: new Date().toISOString() };
  persistDatabase(db);
}

export async function addCustomerCreditPayment(
  phone: string,
  amount: number,
  date: string,
  notes?: string
): Promise<CustomerCreditPayment> {
  const key = normalizeCustomerPhone(phone);
  if (!isValidDateKey(date) || date > getPakistanDateKey(new Date())) {
    throw new Error('Choose a valid payment date that is today or earlier.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const db = loadDatabase();
  db.creditPayments ??= [];
  const creditPayments = db.creditPayments;
  const creditOrders = db.orders.filter(
    (order) =>
      normalizeCustomerPhone(order.customerPhone) === key &&
      order.status === 'completed' &&
      order.paymentMethod === 'monthly_credit'
  );
  const creditSales = creditOrders.reduce((total, order) => total + order.grandTotal, 0);
  const previousPayments = creditPayments
    .filter((payment) => normalizeCustomerPhone(payment.phone) === key)
    .reduce((total, payment) => total + payment.amount, 0);
  const balance = Math.max(0, creditSales - previousPayments);
  if (amount > balance) {
    throw new Error(`Payment exceeds the outstanding balance of Rs. ${balance}.`);
  }

  const payment: CustomerCreditPayment = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    phone: key,
    amount: Math.round(amount * 100) / 100,
    date,
    notes: notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  db.creditPayments.push(payment);
  persistDatabase(db);
  return payment;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const db = loadDatabase();
  const orderIndex = db.orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return false;

  db.orders.splice(orderIndex, 1);
  persistDatabase(db);
  return true;
}

export function createWhatsAppOrderUrl(phoneNumber: string, message: string): string | null {
  const targetWhatsApp = phoneNumber.replace(/\D/g, '');
  if (!targetWhatsApp) return null;

  return `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(message)}`;
}

/**
 * Authoritative Server-Side Order Price Validation:
 * Never trusts prices sent by the client. Re-queries products/deals from the DB,
 * validates item existence and availability, and recalculates line items and grand totals.
 */
export async function serverValidateAndCreateOrder(payload: {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  specialInstructions?: string;
  items: Array<{
    itemType: 'product' | 'deal';
    itemId: string;
    quantity: number;
    addons?: Array<{ id: string; nameEn: string; price: number }>;
    specialInstructions?: string;
  }>;
}, options: {
  source?: Order['source'];
  initialStatus?: OrderStatus;
  statusNotes?: string;
  paymentMethod?: Order['paymentMethod'];
} = {}): Promise<{ order: Order; whatsappUrl: string }> {
  const db = loadDatabase();

  if (!payload.customerName || payload.customerName.trim().length < 2) {
    throw new Error('Please provide your name.');
  }

  const cleanPhone = payload.customerPhone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    throw new Error('Please provide a valid contact phone number.');
  }
  if (
    options.paymentMethod === 'monthly_credit' &&
    !db.monthlyCreditAccounts?.[normalizeCustomerPhone(payload.customerPhone)]?.enabled
  ) {
    throw new Error('This customer is not enabled for a monthly credit account.');
  }

  if (payload.orderType === 'delivery') {
    if (!payload.deliveryAddress || payload.deliveryAddress.trim().length < 5) {
      throw new Error('Delivery address is required for delivery orders.');
    }
  }

  if (payload.orderType === 'dine_in') {
    if (payload.tableNumber) {
      const table = db.tables.find(
        (t) => t.id.toLowerCase() === payload.tableNumber?.toLowerCase()
      );
      if (!table || !table.isActive) {
        throw new Error(`Table ${payload.tableNumber} is not recognized or active.`);
      }
    }
  }

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  const validatedItems: OrderItemRecord[] = [];
  let calculatedSubtotal = 0;

  for (const clientItem of payload.items) {
    const qty = Math.max(1, Math.min(50, Math.floor(clientItem.quantity || 1)));

    if (clientItem.itemType === 'product') {
      const product = db.products.find((p) => p.id === clientItem.itemId);
      if (!product) {
        throw new Error(`Product "${clientItem.itemId}" was not found.`);
      }
      if (!product.isAvailable) {
        throw new Error(`Item "${product.nameEn}" is currently sold out.`);
      }

      // Addons validation
      let addonsCost = 0;
      const validAddons: Array<{ id: string; nameEn: string; price: number }> = [];
      if (clientItem.addons && clientItem.addons.length > 0) {
        for (const addon of clientItem.addons) {
          const addonItem = db.products.find((p) => p.id === addon.id);
          if (addonItem && addonItem.categoryId === 'addons' && addonItem.isAvailable) {
            validAddons.push({
              id: addonItem.id,
              nameEn: addonItem.nameEn,
              price: addonItem.price,
            });
            addonsCost += addonItem.price;
          }
        }
      }

      const unitTotal = product.price + addonsCost;
      const lineSubtotal = unitTotal * qty;
      calculatedSubtotal += lineSubtotal;

      validatedItems.push({
        itemType: 'product',
        itemId: product.id,
        categoryId: product.categoryId,
        nameEn: product.nameEn,
        nameUr: product.nameUr,
        unitPrice: unitTotal,
        quantity: qty,
        addons: validAddons.length > 0 ? validAddons : undefined,
        specialInstructions: clientItem.specialInstructions,
        subtotal: lineSubtotal,
      });
    } else if (clientItem.itemType === 'deal') {
      const deal = db.deals.find((d) => d.id === clientItem.itemId);
      if (!deal) {
        throw new Error(`Deal "${clientItem.itemId}" was not found.`);
      }
      if (!deal.isAvailable) {
        throw new Error(`Deal "${deal.nameEn}" is currently unavailable.`);
      }

      const lineSubtotal = deal.price * qty;
      calculatedSubtotal += lineSubtotal;

      validatedItems.push({
        itemType: 'deal',
        itemId: deal.id,
        components: deal.components,
        nameEn: deal.nameEn,
        nameUr: deal.nameUr,
        unitPrice: deal.price,
        quantity: qty,
        specialInstructions: clientItem.specialInstructions,
        subtotal: lineSubtotal,
      });
    }
  }

  // Delivery charge calculation
  let deliveryFee = 0;
  if (payload.orderType === 'delivery') {
    deliveryFee = db.settings.deliveryCharges;
    if (calculatedSubtotal < db.settings.minimumOrder) {
      throw new Error(
        `Minimum order amount for delivery is Rs. ${db.settings.minimumOrder}. Current items: Rs. ${calculatedSubtotal}`
      );
    }
  }

  const grandTotal = calculatedSubtotal + deliveryFee;

  // Generate unique order ID: SS-YYYYMMDD-XXXX
  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const orderId = `SS-${todayStr}-${randomSuffix}`;

  // Format order type display
  const orderTypeDisplay =
    payload.orderType === 'dine_in'
      ? 'Dine-in'
      : payload.orderType === 'takeaway'
      ? 'Takeaway / Pickup'
      : 'Home Delivery';

  // Build the standardized WhatsApp message required by prompt
  const messageLines: string[] = [
    `*NEW ORDER — ${db.settings.restaurantName.toUpperCase()}*`,
    `Order ID: ${orderId}`,
    `Order Type: ${orderTypeDisplay}`,
    `Customer Name: ${payload.customerName.trim()}`,
    `Phone: ${payload.customerPhone.trim()}`,
  ];

  if (payload.orderType === 'dine_in' && payload.tableNumber) {
    messageLines.push(`Table Number: ${payload.tableNumber.toUpperCase()}`);
  }

  if (payload.orderType === 'delivery') {
    messageLines.push(`Delivery Address: ${payload.deliveryAddress?.trim()}`);
  }

  messageLines.push(``);
  messageLines.push(`*ORDER ITEMS*`);

  for (const item of validatedItems) {
    let itemLine = `• ${item.nameEn} × ${item.quantity} — Rs. ${item.subtotal}`;
    if (item.addons && item.addons.length > 0) {
      const addonNames = item.addons.map((a) => a.nameEn).join(', ');
      itemLine += ` (+ ${addonNames})`;
    }
    messageLines.push(itemLine);
  }

  messageLines.push(``);
  messageLines.push(`Items Subtotal: Rs. ${calculatedSubtotal}`);
  if (payload.orderType === 'delivery') {
    messageLines.push(`Delivery Charges: Rs. ${deliveryFee}`);
  }
  messageLines.push(`*Grand Total: Rs. ${grandTotal}*`);

  const specialNotes = payload.specialInstructions?.trim() || 'None';
  messageLines.push(`Special Instructions: ${specialNotes}`);
  messageLines.push(``);
  messageLines.push(`Please confirm availability and the order total.`);

  const fullTextMessage = messageLines.join('\n');

  const whatsappUrl = createWhatsAppOrderUrl(
    db.settings.whatsappNumberFormatted,
    fullTextMessage
  );
  if (!whatsappUrl) {
    throw new Error('Configure the restaurant WhatsApp number in Settings before accepting orders.');
  }

  const newOrder: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: options.source ?? 'website',
    paymentMethod: options.paymentMethod ?? 'cash',
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    orderType: payload.orderType,
    tableNumber: payload.tableNumber?.toUpperCase(),
    deliveryAddress: payload.deliveryAddress?.trim(),
    specialInstructions: payload.specialInstructions?.trim(),
    items: validatedItems,
    itemsSubtotal: calculatedSubtotal,
    deliveryCharges: deliveryFee,
    grandTotal: grandTotal,
    status: options.initialStatus ?? 'awaiting_whatsapp',
    statusNotes: options.statusNotes,
    whatsappMessagePrefilled: fullTextMessage,
    whatsappSentDeclaredByUser: false,
  };

  db.orders.push(newOrder);
  persistDatabase(db);

  return { order: newOrder, whatsappUrl };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  statusNotes?: string,
  estimatedMinutes?: number
): Promise<Order | null> {
  const db = loadDatabase();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return null;

  const now = new Date().toISOString();
  if (status === 'completed' && order.status !== 'completed') {
    order.completedAt = now;
  } else if (status !== 'completed' && order.status === 'completed') {
    delete order.completedAt;
  }
  order.status = status;
  order.updatedAt = now;
  if (statusNotes !== undefined) order.statusNotes = statusNotes;
  if (estimatedMinutes !== undefined) order.estimatedMinutes = estimatedMinutes;

  persistDatabase(db);
  return order;
}

export async function markWhatsAppDeclaredSent(orderId: string): Promise<Order | null> {
  const db = loadDatabase();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return null;

  order.whatsappSentDeclaredByUser = true;
  // Moves from awaiting_whatsapp to pending verification
  if (order.status === 'awaiting_whatsapp') {
    order.status = 'pending';
  }
  order.updatedAt = new Date().toISOString();

  persistDatabase(db);
  return order;
}

/* =========================================================
   DASHBOARD STATS
========================================================= */

export async function getDashboardStats(): Promise<{
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  todayRevenue: number;
  recentOrders: Order[];
  topSellingProducts: Array<{ name: string; count: number; revenue: number }>;
}> {
  const db = loadDatabase();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const todayOrdersList = db.orders.filter((o) => o.createdAt.startsWith(todayStr));
  const pendingCount = db.orders.filter(
    (o) => o.status === 'pending' || o.status === 'awaiting_whatsapp'
  ).length;
  const confirmedCount = db.orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready'
  ).length;
  const completedCount = db.orders.filter((o) => o.status === 'completed').length;

  const todayRevenue = todayOrdersList
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  // Calculate product sales from real recorded orders
  const itemCounts: Record<string, { count: number; revenue: number }> = {};
  for (const ord of db.orders) {
    if (ord.status === 'cancelled') continue;
    for (const it of ord.items) {
      if (!itemCounts[it.nameEn]) {
        itemCounts[it.nameEn] = { count: 0, revenue: 0 };
      }
      itemCounts[it.nameEn].count += it.quantity;
      itemCounts[it.nameEn].revenue += it.subtotal;
    }
  }

  const topSellingProducts = Object.entries(itemCounts)
    .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentOrders = [...db.orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    totalOrders: db.orders.length,
    todayOrders: todayOrdersList.length,
    pendingOrders: pendingCount,
    confirmedOrders: confirmedCount,
    completedOrders: completedCount,
    todayRevenue,
    recentOrders,
    topSellingProducts,
  };
}
