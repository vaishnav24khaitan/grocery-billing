"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProducts, recordSale, fetchStaffMe, staffLogout } from "@/lib/api";
import {
  formatCurrency,
  unitPriceOf,
  type ProductJSON,
  type CartItem,
  type BillLine,
  type StaffSession,
} from "@/lib/types";
import Bill from "@/components/Bill";
import StaffLogin from "@/components/StaffLogin";
import LanguageToggle from "@/components/LanguageToggle";
import { translations, LANG_STORAGE_KEY, type Lang } from "@/lib/i18n";

export default function BillingApp() {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  const [products, setProducts] = useState<ProductJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showBill, setShowBill] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  // Prevents recording the same (unchanged) cart as multiple sales.
  const saleRecordedRef = useRef(false);

  const t = translations[lang];

  // Show the Hindi product name when Hindi is selected and one was provided.
  const pname = (p: ProductJSON) =>
    lang === "hi" && p.nameHi ? p.nameHi : p.name;

  // Load the saved language preference once on mount (avoids SSR mismatch).
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (active && (saved === "en" || saved === "hi")) setLang(saved);
    })();
    return () => {
      active = false;
    };
  }, []);

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchStaffMe();
        if (active) setStaff(me);
      } catch {
        if (active) setStaff(null);
      } finally {
        if (active) setAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!staff) return;
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
  }, [staff]);

  async function onStaffLogout() {
    try {
      await staffLogout();
    } finally {
      setStaff(null);
      setCart({});
      setShowBill(false);
      saleRecordedRef.current = false;
    }
  }

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
    saleRecordedRef.current = false;
    setCart((prev) => {
      const existing = prev[p._id];
      const qty = (existing?.qty ?? 0) + 1;
      return {
        ...prev,
        [p._id]: {
          product: p,
          qty,
          unitPrice: existing?.unitPrice ?? unitPriceOf(p),
        },
      };
    });
  }

  // Set an exact quantity (supports decimals like 1.25). Does not remove the
  // line — clamps to 0; use removeItem() to delete.
  function setQty(id: string, qty: number) {
    saleRecordedRef.current = false;
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const next = Number.isFinite(qty) && qty > 0 ? qty : 0;
      return { ...prev, [id]: { ...item, qty: next } };
    });
  }

  function stepQty(id: string, delta: number) {
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const next = Math.max(0, +(item.qty + delta).toFixed(3));
      return { ...prev, [id]: { ...item, qty: next } };
    });
    saleRecordedRef.current = false;
  }

  // Override the per-unit price for a cart line.
  function setUnitPrice(id: string, price: number) {
    saleRecordedRef.current = false;
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const next = Number.isFinite(price) && price >= 0 ? price : 0;
      return { ...prev, [id]: { ...item, unitPrice: next } };
    });
  }

  function removeItem(id: string) {
    saleRecordedRef.current = false;
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function clearCart() {
    saleRecordedRef.current = false;
    setCart({});
    setShowBill(false);
  }

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const billLines: BillLine[] = useMemo(
    () =>
      cartItems
        .filter((c) => c.qty > 0)
        .map((c) => ({
          name: c.product.name,
          nameHi: c.product.nameHi,
          unit: c.product.unit,
          unitPrice: c.unitPrice,
          qty: c.qty,
          lineTotal: +(c.unitPrice * c.qty).toFixed(2),
        })),
    [cartItems]
  );
  const total = useMemo(
    () => +billLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2),
    [billLines]
  );

  async function handleCheckout() {
    if (billLines.length === 0) return;
    setCheckoutError("");
    // Already recorded this exact cart — just show the bill again.
    if (saleRecordedRef.current) {
      setShowBill(true);
      return;
    }
    setCheckingOut(true);
    try {
      await recordSale({ items: billLines, total });
      saleRecordedRef.current = true;
      setShowBill(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to record sale";
      setCheckoutError(msg);
      // Session expired / invalid → force staff to sign in again.
      if (/sign in|session/i.test(msg)) {
        setStaff(null);
      }
    } finally {
      setCheckingOut(false);
    }
  }

  if (authChecking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-500">{t.loading}</p>
      </div>
    );
  }

  if (!staff) {
    return <StaffLogin onSuccess={setStaff} />;
  }

  if (showBill) {
    return (
      <Bill
        lines={billLines}
        total={total}
        lang={lang}
        onChangeLang={changeLang}
        onBack={() => setShowBill(false)}
        onNewSale={clearCart}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-sm text-gray-600">
          {t.billingAs}{" "}
          <span className="font-semibold text-gray-900">{staff.name}</span>{" "}
          <span className="text-gray-400">(@{staff.username})</span>
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle lang={lang} onChange={changeLang} />
          <button
            onClick={onStaffLogout}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            {t.logout}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Products */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="input flex-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input sm:w-48"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? t.all : c}
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
            <p className="text-sm text-gray-500">{t.loadingProducts}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">{t.noProducts}</p>
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
                    {pname(p)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {p.category} · {t.per} {p.unit}
                  </span>
                  <span className="mt-1 font-semibold text-emerald-700">
                    {formatCurrency(p.price)}
                    <span className="text-xs font-normal text-gray-500">
                      {" "}
                      / {p.priceQuantity > 1 ? `${p.priceQuantity} ` : ""}
                      {p.unit}
                    </span>
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
              <h2 className="text-lg font-bold text-gray-900">{t.cart}</h2>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t.clear}
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t.emptyCart}
              </p>
            ) : (
              <ul className="space-y-4">
                {cartItems.map(({ product, qty, unitPrice }) => (
                  <li
                    key={product._id}
                    className="rounded-lg border border-gray-100 p-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {pname(product)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(product.price)} /{" "}
                          {product.priceQuantity > 1
                            ? `${product.priceQuantity} `
                            : ""}
                          {product.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(product._id)}
                        className="text-gray-400 hover:text-red-600"
                        aria-label="Remove item"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-2 flex items-end gap-2">
                      {/* Quantity (supports decimals, e.g. 1.25) */}
                      <label className="flex flex-col text-[10px] text-gray-500">
                        {t.qty} ({product.unit})
                        <div className="mt-0.5 flex items-center gap-1">
                          <button
                            onClick={() => stepQty(product._id, -1)}
                            className="h-7 w-6 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={qty}
                            onChange={(e) =>
                              setQty(product._id, Number(e.target.value))
                            }
                            className="h-7 w-16 rounded-md border border-gray-300 text-center text-sm"
                          />
                          <button
                            onClick={() => stepQty(product._id, 1)}
                            className="h-7 w-6 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                      </label>

                      {/* Per-unit price override */}
                      <label className="flex flex-col text-[10px] text-gray-500">
                        {t.rate} (₹/{product.unit})
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) =>
                            setUnitPrice(product._id, Number(e.target.value))
                          }
                          className="mt-0.5 h-7 w-20 rounded-md border border-gray-300 text-center text-sm"
                        />
                      </label>

                      <span className="ml-auto pb-1 text-sm font-semibold text-gray-900">
                        {formatCurrency(+(unitPrice * qty).toFixed(2))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm font-medium text-gray-600">{t.total}</span>
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              disabled={billLines.length === 0 || checkingOut}
              onClick={handleCheckout}
              className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {checkingOut ? t.saving : t.checkout}
            </button>
            {checkoutError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {checkoutError}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
