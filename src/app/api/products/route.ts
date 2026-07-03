import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeProduct, parseProductInput } from "@/lib/products";
import { translateToHindi } from "@/lib/translate";

// GET /api/products?search=&category=  — public product listing
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (category && category.toLowerCase() !== "all") {
      filter.category = category;
    }

    const products = await Product.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json(products.map(serializeProduct));
  } catch (err) {
    console.error("GET /api/products failed", err);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

// POST /api/products — admin only
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data, error } = parseProductInput(body);
  if (error || !data) {
    return NextResponse.json({ error: error ?? "Invalid input" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    // Auto-fill the Hindi name if the admin didn't provide one.
    if (!data.nameHi && data.name) {
      const hi = await translateToHindi(data.name);
      if (hi) data.nameHi = hi;
    }
    const created = await Product.create(data);
    return NextResponse.json(serializeProduct(created.toObject()), {
      status: 201,
    });
  } catch (err) {
    console.error("POST /api/products failed", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
