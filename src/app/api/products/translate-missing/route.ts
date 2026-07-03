import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { isAdminAuthenticated } from "@/lib/auth";
import { translateToHindi } from "@/lib/translate";

// POST /api/products/translate-missing — admin only.
// Fills in the Hindi name for any product that doesn't have one yet.
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const products = await Product.find({
      $or: [{ nameHi: { $exists: false } }, { nameHi: "" }],
    }).lean<{ _id: unknown; name: string }[]>();

    let translated = 0;
    let failed = 0;
    // Sequential to stay within the translation API rate limit.
    for (const p of products) {
      const hi = await translateToHindi(p.name);
      if (hi) {
        await Product.findByIdAndUpdate(p._id, { nameHi: hi });
        translated++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: products.length,
      translated,
      failed,
    });
  } catch (err) {
    console.error("POST /api/products/translate-missing failed", err);
    return NextResponse.json(
      { error: "Failed to translate names" },
      { status: 500 }
    );
  }
}
