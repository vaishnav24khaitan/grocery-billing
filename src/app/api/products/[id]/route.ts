import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeProduct, parseProductInput } from "@/lib/products";

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/products/[id]
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]">
) {
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeProduct(product));
  } catch (err) {
    console.error("GET /api/products/[id] failed", err);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}

// PUT /api/products/[id] — admin only
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/products/[id]">
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data, error } = parseProductInput(body, { partial: true });
  if (error || !data) {
    return NextResponse.json({ error: error ?? "Invalid input" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const updated = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeProduct(updated));
  } catch (err) {
    console.error("PUT /api/products/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — admin only
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]">
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const deleted = await Product.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/products/[id] failed", err);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
