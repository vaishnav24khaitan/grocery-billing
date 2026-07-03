/**
 * Seed sample grocery products.
 *
 * Usage:
 *   1. Ensure .env.local has a valid MONGODB_URI
 *   2. npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local");
  process.exit(1);
}

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    unit: String,
    category: String,
    quantity: Number,
    imageUrl: String,
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

const SAMPLE = [
  { name: "Basmati Rice", price: 120, unit: "kg", category: "Grains", quantity: 50 },
  { name: "Wheat Flour (Atta)", price: 45, unit: "kg", category: "Grains", quantity: 60 },
  { name: "Toor Dal", price: 140, unit: "kg", category: "Pulses", quantity: 40 },
  { name: "Sugar", price: 42, unit: "kg", category: "Essentials", quantity: 80 },
  { name: "Refined Oil", price: 130, unit: "L", category: "Essentials", quantity: 35 },
  { name: "Milk", price: 30, unit: "L", category: "Dairy", quantity: 100 },
  { name: "Butter", price: 55, unit: "pcs", category: "Dairy", quantity: 25 },
  { name: "Eggs (tray)", price: 90, unit: "pack", category: "Dairy", quantity: 30 },
  { name: "Potato", price: 25, unit: "kg", category: "Vegetables", quantity: 70 },
  { name: "Onion", price: 35, unit: "kg", category: "Vegetables", quantity: 65 },
  { name: "Tomato", price: 40, unit: "kg", category: "Vegetables", quantity: 55 },
  { name: "Tea Powder", price: 240, unit: "kg", category: "Beverages", quantity: 20 },
  { name: "Biscuits", price: 20, unit: "pcs", category: "Snacks", quantity: 120 },
  { name: "Salt", price: 22, unit: "kg", category: "Essentials", quantity: 90 },
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected. Seeding products…");
  await Product.deleteMany({});
  const docs = await Product.insertMany(
    SAMPLE.map((p) => ({ imageUrl: "", ...p }))
  );
  console.log(`Inserted ${docs.length} products.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
