import { Schema, model, models } from "mongoose";

const SaleItemSchema = new Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    items: { type: [SaleItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Sale = models.Sale || model("Sale", SaleSchema);
