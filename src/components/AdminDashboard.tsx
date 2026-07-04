"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  translateMissingHindi,
  adminLogout,
  type ProductPayload,
} from "@/lib/api";
import { PRODUCT_UNITS, formatCurrency, type ProductJSON } from "@/lib/types";
import SalesReport from "@/components/SalesReport";
import StaffManager from "@/components/StaffManager";

const EMPTY_FORM: ProductPayload = {
  name: "",
  nameHi: "",
  price: 0,
  priceQuantity: 1,
  unit: "pcs",
  category: "General",
  imageUrl: "",
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<ProductJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"products" | "sales" | "staff">("products");
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProducts();
        if (active) setProducts(data);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load");
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

  function startEdit(p: ProductJSON) {
    setEditingId(p._id);
    setForm({
      name: p.name,
      nameHi: p.nameHi,
      price: p.price,
      priceQuantity: p.priceQuantity,
      unit: p.unit,
      category: p.category,
      imageUrl: p.imageUrl,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: ProductJSON) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await deleteProduct(p._id);
      if (editingId === p._id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onTranslateMissing() {
    setTranslating(true);
    setTranslateMsg("");
    setError("");
    try {
      const r = await translateMissingHindi();
      setTranslateMsg(
        r.total === 0
          ? "All products already have a Hindi name."
          : `Translated ${r.translated} of ${r.total}${
              r.failed ? ` (${r.failed} could not be translated)` : ""
            }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  async function onLogout() {
    await adminLogout();
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-gray-300 p-0.5">
          <button
            onClick={() => setTab("products")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === "products"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setTab("sales")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === "sales"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setTab("staff")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === "staff"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Staff
          </button>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Log out
        </button>
      </div>

      {tab === "sales" && <SalesReport />}
      {tab === "staff" && <StaffManager />}

      {tab === "products" && (
        <>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Form */}
      <form
        onSubmit={onSubmit}
        className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit product" : "Add new product"}
          </h2>
        </div>
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Name (Hindi) — auto-filled if left blank">
          <input
            value={form.nameHi}
            onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
            placeholder="स्वतः अनुवाद (या यहाँ लिखें)"
            className="input"
          />
        </Field>
        <Field label="Price (₹)">
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
            className="input"
          />
        </Field>
        <Field label={`Price is for (quantity in ${form.unit})`}>
          <input
            required
            type="number"
            min={0.001}
            step="any"
            value={form.priceQuantity}
            onChange={(e) =>
              setForm({ ...form, priceQuantity: Number(e.target.value) })
            }
            className="input"
            placeholder="e.g. 10 for ₹40 per 10 g"
          />
        </Field>
        <Field label="Unit">
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="input"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Image URL (optional)">
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="input"
            placeholder="https://…"
          />
        </Field>
        <div className="flex items-end gap-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Update product" : "Add product"}
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

      {/* List header with bulk-translate action */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700">Products</h2>
        <div className="flex items-center gap-3">
          {translateMsg && (
            <span className="text-xs text-gray-600">{translateMsg}</span>
          )}
          <button
            type="button"
            onClick={onTranslateMissing}
            disabled={translating}
            className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {translating ? "Translating…" : "Translate missing Hindi names"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500">No products yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Name (Hindi)</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {p.nameHi || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.category}</td>
                  <td className="px-4 py-2 text-gray-900">
                    {formatCurrency(p.price)}
                    <span className="text-gray-500">
                      {" "}
                      / {p.priceQuantity > 1 ? `${p.priceQuantity} ` : ""}
                      {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.unit}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-emerald-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(p)}
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
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}
