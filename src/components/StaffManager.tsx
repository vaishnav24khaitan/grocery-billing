"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  type StaffPayload,
} from "@/lib/api";
import type { StaffJSON } from "@/lib/types";

const EMPTY_FORM: StaffPayload = {
  username: "",
  name: "",
  password: "",
};

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<StaffPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStaff(await fetchStaff());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchStaff();
        if (active) setStaff(data);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load staff");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(s: StaffJSON) {
    setEditingId(s._id);
    setForm({ username: s.username, name: s.name, password: "", active: s.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const payload: Partial<StaffPayload> = {
          username: form.username,
          name: form.name,
          active: form.active,
        };
        if (form.password) payload.password = form.password;
        await updateStaff(editingId, payload);
      } else {
        await createStaff(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(s: StaffJSON) {
    setError("");
    try {
      await updateStaff(s._id, { active: !s.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDelete(s: StaffJSON) {
    if (!confirm(`Delete billing staff "${s.name}" (@${s.username})?`)) return;
    setError("");
    try {
      await deleteStaff(s._id);
      if (editingId === s._id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit billing staff" : "Add billing staff"}
          </h2>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Username
          </span>
          <input
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input"
            placeholder="e.g. ramesh"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {editingId ? "New password (leave blank to keep)" : "Password"}
          </span>
          <input
            type="password"
            required={!editingId}
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
            autoComplete="new-password"
          />
        </label>
        <div className="flex items-end gap-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Update staff" : "Add staff"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading staff…</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-gray-500">
          No billing staff yet. Add one above so they can sign in on the billing
          screen.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600">@{s.username}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-emerald-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggleActive(s)}
                        className="text-gray-600 hover:underline"
                      >
                        {s.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
