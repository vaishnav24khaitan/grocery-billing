// Client-safe types & constants (no server/mongoose imports).

export const PRODUCT_UNITS = ["kg", "g", "L", "ml", "pcs", "pack"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface ProductJSON {
  _id: string;
  name: string;
  nameHi: string;
  price: number;
  priceQuantity: number;
  unit: ProductUnit;
  category: string;
  quantity: number;
  imageUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: ProductJSON;
  qty: number;
  // Effective price per single `unit` (defaults to product.price /
  // product.priceQuantity, but can be overridden per line during billing).
  unitPrice: number;
}

export interface BillLine {
  name: string;
  nameHi?: string;
  unit: ProductUnit;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export const CURRENCY = "₹";

export interface SalesBucket {
  key: string;
  total: number;
  count: number;
}

export interface SalesSummary {
  today: SalesBucket;
  thisMonth: SalesBucket;
  daily: SalesBucket[];
  monthly: SalesBucket[];
  byStaffToday: StaffTotals[];
  byStaffMonth: StaffTotals[];
}

// The summary API returns the combined report at the top level (backward
// compatible) plus a per-source breakdown.
export interface SalesSummaryResponse extends SalesSummary {
  retail: SalesSummary;
  bulk: SalesSummary;
  all: SalesSummary;
}

export type SalesSource = "all" | "retail" | "bulk";

export interface StaffJSON {
  _id: string;
  username: string;
  name: string;
  active: boolean;
  createdAt?: string;
}

export interface StaffSession {
  id: string;
  username: string;
  name: string;
}

export interface StaffTotals {
  staffName: string;
  staffUsername: string;
  total: number;
  count: number;
}

// ---- Bulk billing ----

export interface BulkCustomerJSON {
  _id: string;
  name: string;
  phone: string;
  address: string;
  createdAt?: string;
  // Derived (present on list/ledger responses):
  balance?: number;
  totalBilled?: number;
  totalPaid?: number;
  lastActivityAt?: string;
}

export interface BulkLine {
  name: string;
  unit: ProductUnit;
  qty: number;
  // Price charged per single `unit`.
  price: number;
  // Optional actual/market price per unit, for showing a discount.
  mrp?: number;
  lineTotal: number;
}

export interface BulkBillJSON {
  _id: string;
  customerId: string;
  customerName: string;
  billNo: string;
  items: BulkLine[];
  total: number;
  paidNow: number;
  staffName?: string;
  createdAt?: string;
}

export interface BulkPaymentJSON {
  _id: string;
  customerId: string;
  amount: number;
  note: string;
  staffName?: string;
  createdAt?: string;
}

export interface BulkLedger {
  customer: BulkCustomerJSON;
  bills: BulkBillJSON[];
  payments: BulkPaymentJSON[];
  totalBilled: number;
  totalPaid: number;
  balance: number;
}

export function formatCurrency(amount: number): string {
  return `${CURRENCY}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Effective price for a single `unit` of the product.
export function unitPriceOf(p: {
  price: number;
  priceQuantity: number;
}): number {
  const basis = p.priceQuantity > 0 ? p.priceQuantity : 1;
  return +(p.price / basis).toFixed(4);
}
