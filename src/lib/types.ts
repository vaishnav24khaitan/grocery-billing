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
