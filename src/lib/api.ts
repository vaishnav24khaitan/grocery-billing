import type {
  ProductJSON,
  BillLine,
  SalesSummary,
  StaffJSON,
  StaffSession,
} from "@/lib/types";

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function fetchProducts(params?: {
  search?: string;
  category?: string;
}): Promise<ProductJSON[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  const res = await fetch(`/api/products?${qs.toString()}`, {
    cache: "no-store",
  });
  return handle<ProductJSON[]>(res);
}

export type ProductPayload = {
  name: string;
  price: number;
  unit: string;
  category: string;
  imageUrl: string;
};

export async function createProduct(
  payload: ProductPayload
): Promise<ProductJSON> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<ProductJSON>(res);
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>
): Promise<ProductJSON> {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<ProductJSON>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  await handle<{ ok: boolean }>(res);
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  await handle<{ ok: boolean }>(res);
}

export async function adminLogout(): Promise<void> {
  const res = await fetch("/api/admin/logout", { method: "POST" });
  await handle<{ ok: boolean }>(res);
}

export async function recordSale(payload: {
  items: BillLine[];
  total: number;
}): Promise<{ id: string }> {
  const res = await fetch("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ ok: boolean; id: string }>(res);
}

export async function fetchSalesSummary(): Promise<SalesSummary> {
  const res = await fetch("/api/sales/summary", { cache: "no-store" });
  return handle<SalesSummary>(res);
}

// ---- Billing staff auth ----

export async function staffLogin(
  username: string,
  password: string
): Promise<StaffSession> {
  const res = await fetch("/api/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handle<StaffSession>(res);
}

export async function staffLogout(): Promise<void> {
  const res = await fetch("/api/staff/logout", { method: "POST" });
  await handle<{ ok: boolean }>(res);
}

export async function fetchStaffMe(): Promise<StaffSession | null> {
  const res = await fetch("/api/staff/me", { cache: "no-store" });
  const body = await handle<{ staff: StaffSession | null }>(res);
  return body.staff;
}

// ---- Admin staff management ----

export type StaffPayload = {
  username: string;
  name: string;
  password?: string;
  active?: boolean;
};

export async function fetchStaff(): Promise<StaffJSON[]> {
  const res = await fetch("/api/staff", { cache: "no-store" });
  return handle<StaffJSON[]>(res);
}

export async function createStaff(payload: StaffPayload): Promise<StaffJSON> {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<StaffJSON>(res);
}

export async function updateStaff(
  id: string,
  payload: Partial<StaffPayload>
): Promise<StaffJSON> {
  const res = await fetch(`/api/staff/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<StaffJSON>(res);
}

export async function deleteStaff(id: string): Promise<void> {
  const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
  await handle<{ ok: boolean }>(res);
}
