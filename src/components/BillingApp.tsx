"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/lib/api";
import {
  formatCurrency,
  type ProductJSON,
  type CartItem,
  type BillLine,
} from "@/lib/types";
import Bill from "@/components/Bill";

export default function BillingApp() {
  const [products, setProducts] = useState<ProductJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showBill, setShowBill] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProducts();
        if (active) setProducts(data);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : "Failed to load products"
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesCat = category === "All" || p.category === category;
      return matchesSearch && matchesCat;
    });
  }, [products, search, category]);

  function addToCart(p: ProductJSON) {
    setCart((prev) => {
      const existing = prev[p._id];
      const qty = (existing?.qty ?? 0) + 1;
      return { ...prev, [p._id]: { product: p, qty } };
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const item = prev[id];
      if (!item) return prev;
      return { ...prev, [id]: { ...item, qty } };
    });
  }

  function clearCart() {
    setCart({});
    setShowBill(false);
  }

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const billLines: BillLine[] = useMemo(
    () =>
      cartItems.map((c) => ({
        name: c.product.name,
        unit: c.product.unit,
        unitPrice: c.product.price,
        qty: c.qty,
        lineTotal: +(c.product.price * c.qty).toFixed(2),
      })),
    [cartItems]
  );
  const total = useMemo(
    () => +billLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2),
    [billLines]
  );

  if (showBill) {
    return (
      <Bill
        lines={billLines}
        total={total}
        onBack={() => setShowBill(false)}
        onNewSale={clearCart}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Products */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="input flex-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input sm:w-48"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Loading products…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-400 hover:shadow"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="mb-2 h-24 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-emerald-50 text-2xl">
                      🛒
                    </div>
                  )}
                  <span className="line-clamp-2 text-sm font-medium text-gray-900">
                    {p.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {p.category} · per {p.unit}
                  </span>
                  <span className="mt-1 font-semibold text-emerald-700">
                    {formatCurrency(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Cart */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cart</h2>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                Tap a product to add it to the cart.
              </p>
            ) : (
              <ul className="space-y-3">
                {cartItems.map(({ product, qty }) => (
                  <li key={product._id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(product.price)} / {product.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(product._id, qty - 1)}
                        className="h-7 w-7 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) =>
                          setQty(product._id, Number(e.target.value))
                        }
                        className="h-7 w-12 rounded-md border border-gray-300 text-center text-sm"
                      />
                      <button
                        onClick={() => setQty(product._id, qty + 1)}
                        className="h-7 w-7 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(+(product.price * qty).toFixed(2))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              disabled={cartItems.length === 0}
              onClick={() => setShowBill(true)}
              className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Checkout &amp; Generate Bill
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
