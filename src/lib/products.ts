import { PRODUCT_UNITS, type ProductJSON, type ProductUnit } from "@/lib/types";

/** Convert a Mongoose product document to a plain JSON-safe object. */
export function serializeProduct(doc: {
  _id: unknown;
  name: string;
  nameHi?: string;
  price: number;
  unit: string;
  category: string;
  quantity: number;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): ProductJSON {
  return {
    _id: String(doc._id),
    name: doc.name,
    nameHi: doc.nameHi ?? "",
    price: doc.price,
    unit: doc.unit as ProductUnit,
    category: doc.category,
    quantity: doc.quantity,
    imageUrl: doc.imageUrl ?? "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export interface ProductInput {
  name: string;
  nameHi: string;
  price: number;
  unit: ProductUnit;
  category: string;
  quantity: number;
  imageUrl: string;
}

/**
 * Validate and normalize an incoming product payload.
 * `partial` allows only-provided fields to be validated (used for PUT).
 */
export function parseProductInput(
  body: unknown,
  { partial = false }: { partial?: boolean } = {}
): { data?: Partial<ProductInput>; error?: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object" };
  }
  const b = body as Record<string, unknown>;
  const data: Partial<ProductInput> = {};

  const has = (k: string) => b[k] !== undefined && b[k] !== null;

  if (has("name")) {
    if (typeof b.name !== "string" || !b.name.trim())
      return { error: "name must be a non-empty string" };
    data.name = b.name.trim();
  } else if (!partial) {
    return { error: "name is required" };
  }

  if (has("nameHi")) {
    if (typeof b.nameHi !== "string")
      return { error: "nameHi must be a string" };
    data.nameHi = b.nameHi.trim();
  }

  if (has("price")) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0)
      return { error: "price must be a number >= 0" };
    data.price = price;
  } else if (!partial) {
    return { error: "price is required" };
  }

  if (has("unit")) {
    if (!PRODUCT_UNITS.includes(b.unit as ProductUnit))
      return { error: `unit must be one of: ${PRODUCT_UNITS.join(", ")}` };
    data.unit = b.unit as ProductUnit;
  }

  if (has("category")) {
    if (typeof b.category !== "string")
      return { error: "category must be a string" };
    data.category = b.category.trim() || "General";
  }

  if (has("quantity")) {
    const qty = Number(b.quantity);
    if (!Number.isFinite(qty) || qty < 0)
      return { error: "quantity must be a number >= 0" };
    data.quantity = qty;
  }

  if (has("imageUrl")) {
    if (typeof b.imageUrl !== "string")
      return { error: "imageUrl must be a string" };
    data.imageUrl = b.imageUrl.trim();
  }

  return { data };
}
