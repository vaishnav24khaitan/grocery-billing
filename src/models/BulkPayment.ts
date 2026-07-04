import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const BulkPaymentSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "BulkCustomer",
      required: true,
    },
    // Money received from the customer (a deposit / repayment).
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
    // If this payment was made at billing time, the bill it belongs to.
    billId: { type: Schema.Types.ObjectId, ref: "BulkBill" },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    staffName: { type: String },
    staffUsername: { type: String },
  },
  { timestamps: true }
);

export type BulkPaymentDoc = InferSchemaType<typeof BulkPaymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BulkPayment =
  models.BulkPayment || model("BulkPayment", BulkPaymentSchema);
