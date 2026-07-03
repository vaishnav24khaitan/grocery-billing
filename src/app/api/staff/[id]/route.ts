import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { isAdminAuthenticated } from "@/lib/auth";
import { hashPassword } from "@/lib/staffAuth";

interface StaffLean {
  _id: unknown;
  username: string;
  name: string;
  active: boolean;
  createdAt?: Date;
}

function serialize(s: StaffLean) {
  return {
    _id: String(s._id),
    username: s.username,
    name: s.name,
    active: s.active,
    createdAt: s.createdAt ? s.createdAt.toISOString() : undefined,
  };
}

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// PUT /api/staff/[id] — admin: update name/username/active and optionally reset password.
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/staff/[id]">
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: {
    username?: unknown;
    name?: unknown;
    password?: unknown;
    active?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.username === "string") {
    update.username = body.username.trim().toLowerCase();
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }
    update.passwordHash = hashPassword(body.password);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    if (typeof update.username === "string") {
      const clash = await Staff.findOne({
        username: update.username,
        _id: { $ne: id },
      }).lean();
      if (clash) {
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409 }
        );
      }
    }

    const updated = await Staff.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean<StaffLean>();
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serialize(updated));
  } catch (err) {
    console.error("PUT /api/staff/[id] failed", err);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

// DELETE /api/staff/[id] — admin: remove a billing-staff account.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/staff/[id]">
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
    const deleted = await Staff.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/staff/[id] failed", err);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
