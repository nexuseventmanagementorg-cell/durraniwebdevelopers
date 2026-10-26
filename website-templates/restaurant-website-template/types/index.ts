export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus =
  | 'awaiting_whatsapp'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export interface Category {
  id: string;
  nameEn: string;
  nameUr: string;
  iconName: string;
  order: number;
}

export interface AddonOption {
  id: string;
  nameEn: string;
  nameUr: string;
  price: number;
}

export interface Product {
  id: string;
  nameEn: string;
  nameUr: string;
  categoryId: string;
  price: number;
  descriptionEn: string;
  descriptionUr?: string;
  image: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  originalPriceFormat?: string;
  verifiedFromMenu: boolean;
  originalMenuSection: string;
}

export interface DealComponent {
  nameEn: string;
  nameUr: string;
  quantity: number;
}

export interface Deal {
  id: string;
  dealNumber: number;
  nameEn: string;
  nameUr: string;
  price: number;
  components: DealComponent[];
  descriptionEn: string;
  image: string;
  isAvailable: boolean;
  isFamilyDeal?: boolean;
  originalPriceFormat?: string;
  verifiedFromMenu: boolean;
}

export interface CartItemAddon {
  id: string;
  nameEn: string;
  price: number;
}

export interface CartItem {
  id: string; // unique cart line identifier
  itemType: 'product' | 'deal';
  itemId: string;
  nameEn: string;
  nameUr: string;
  basePrice: number;
  quantity: number;
  addons?: CartItemAddon[];
  specialInstructions?: string;
  image: string;
  lineTotal: number;
}

export interface OrderItemRecord {
  itemType: 'product' | 'deal';
  itemId: string;
  categoryId?: string;
  nameEn: string;
  nameUr: string;
  unitPrice: number;
  quantity: number;
  addons?: CartItemAddon[];
  specialInstructions?: string;
  components?: DealComponent[];
  subtotal: number;
}

export interface Order {
  id: string; // e.g., SS-8492
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  source?: 'website' | 'phone';
  paymentMethod?: 'cash' | 'monthly_credit';
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  specialInstructions?: string;
  items: OrderItemRecord[];
  itemsSubtotal: number;
  deliveryCharges: number;
  grandTotal: number;
  status: OrderStatus;
  statusNotes?: string;
  estimatedMinutes?: number;
  whatsappMessagePrefilled?: string;
  whatsappSentDeclaredByUser?: boolean;
}

export interface DiningTable {
  id: string; // T01, T02
  label: string;
  seats: number;
  isActive: boolean;
}

export interface BusinessSettings {
  restaurantName: string;
  urduName: string;
  tagline: string;
  phoneCandidate: string;
  whatsappNumberFormatted: string;
  isWhatsAppConfirmedByOwner: boolean;
  address: string;
  city: string;
  googleMapsUrl: string;
  facebookUrl: string;
  openingHoursFormatted: string; // e.g. "Mon - Sat: 1:00 PM – 1:00 AM"
  isSundayOff: boolean;
  deliveryCharges: number;
  minimumOrder: number;
  announcementText: string;
  isAnnouncementActive: boolean;
  currencySymbol: string;
  dineInEnabled: boolean;
  takeawayEnabled: boolean;
  deliveryEnabled: boolean;
}

export interface AdminUser {
  username: string;
  role: 'owner' | 'manager' | 'staff';
}

export interface DailyExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface CustomerCreditPayment {
  id: string;
  phone: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerLead {
  phone: string;
  name: string;
  orderCount: number;
  completedOrderCount: number;
  thisMonthOrderCount: number;
  totalSpent: number;
  creditSales: number;
  paymentsReceived: number;
  creditBalance: number;
  monthlyCreditEnabled: boolean;
  lastOrderAt: string;
  favourite: boolean;
  payments: CustomerCreditPayment[];
}
