import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const BulkBillItemSchema = new Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true, default: "kg" },
    qty: { type: Number, required: true, min: 0 },
    // Price charged per single `unit`.
    price: { type: Number, required: true, min: 0 },
    // Optional actual / market price (MRP) per unit, for showing a discount.
    mrp: { type: Number, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BulkBillSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "BulkCustomer",
      required: true,
    },
    customerName: { type: String, required: true },
    billNo: { type: String, required: true },
    items: { type: [BulkBillItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    // Amount the customer paid at billing time (also recorded as a payment).
    paidNow: { type: Number, required: true, min: 0, default: 0 },
    // Billing staff who created the bill (attribution).
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    staffName: { type: String },
    staffUsername: { type: String },
  },
  { timestamps: true }
);

export type BulkBillDoc = InferSchemaType<typeof BulkBillSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BulkBill = models.BulkBill || model("BulkBill", BulkBillSchema);
