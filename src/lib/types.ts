// Client-safe types & constants (no server/mongoose imports).

export const PRODUCT_UNITS = ["kg", "g", "L", "ml", "pcs", "pack"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface ProductJSON {
  _id: string;
  name: string;
  price: number;
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
}

export interface BillLine {
  name: string;
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
}

export function formatCurrency(amount: number): string {
  return `${CURRENCY}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
