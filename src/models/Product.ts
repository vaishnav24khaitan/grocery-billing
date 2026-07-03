import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { PRODUCT_UNITS } from "@/lib/types";

export { PRODUCT_UNITS } from "@/lib/types";
export type { ProductUnit, ProductJSON } from "@/lib/types";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameHi: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      enum: PRODUCT_UNITS,
      default: "pcs",
    },
    category: { type: String, required: true, trim: true, default: "General" },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Reuse the compiled model across hot reloads / serverless invocations.
export const Product =
  models.Product || model("Product", ProductSchema);
