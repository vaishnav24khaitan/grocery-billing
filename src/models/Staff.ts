import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const StaffSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    // Stored as "salt:hash" (scrypt). Never returned to the client.
    passwordHash: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export type StaffDoc = InferSchemaType<typeof StaffSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Reuse the compiled model across hot reloads / serverless invocations.
export const Staff = models.Staff || model("Staff", StaffSchema);
