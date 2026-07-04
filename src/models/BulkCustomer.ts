import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const BulkCustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export type BulkCustomerDoc = InferSchemaType<typeof BulkCustomerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BulkCustomer =
  models.BulkCustomer || model("BulkCustomer", BulkCustomerSchema);
