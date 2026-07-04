"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchStaffMe,
  staffLogout,
  fetchBulkCustomers,
  createBulkCustomer,
  fetchBulkLedger,
  createBulkBill,
  updateBulkBill,
  deleteBulkBill,
  recordBulkPayment,
} from "@/lib/api";
import {
  formatCurrency,
  PRODUCT_UNITS,
  type ProductUnit,
  type StaffSession,
  type BulkCustomerJSON,
  type BulkLedger,
  type BulkLine,
  type BulkBillJSON,
} from "@/lib/types";
import StaffLogin from "@/components/StaffLogin";
import BulkBill from "@/components/BulkBill";

// A line while it is being edited (numbers kept as strings so fields can be
// blank instead of showing a default 0).
interface DraftLine {
  id: string;
  name: string;
  unit: ProductUnit;
  qty: string;
  price: string;
  mrp: string;
}

function newLine(): DraftLine {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    unit: "kg",
    qty: "",
    price: "",
    mrp: "",
  };
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BulkBillingApp() {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [tab, setTab] = useState<"new" | "customers">("new");
  // A saved bill the user chose to edit (opened in the New bill form).
  const [editBill, setEditBill] = useState<BulkBillJSON | null>(null);

  function startEdit(bill: BulkBillJSON) {
    setEditBill(bill);
    setTab("new");
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

  async function onLogout() {
    try {
      await staffLogout();
    } finally {
      setStaff(null);
    }
  }

  if (authChecking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!staff) {
    return <StaffLogin onSuccess={setStaff} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bulk Billing</h1>
          <p className="text-sm text-gray-500">
            Signed in as {staff.name} ({staff.username})
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Log out
        </button>
      </div>

      <div className="mb-6 inline-flex rounded-md border border-gray-300 p-0.5">
        {(["new", "customers"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded px-4 py-1.5 text-sm font-medium ${
              tab === k
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {k === "new" ? "New bill" : "Customers & ledger"}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <NewBill
          editBill={editBill}
          onEditConsumed={() => setEditBill(null)}
        />
      ) : (
        <Customers onEditBill={startEdit} />
      )}
    </div>
  );
}

/* ------------------------------- New bill ------------------------------- */

function NewBill({
  editBill,
  onEditConsumed,
}: {
  editBill: BulkBillJSON | null;
  onEditConsumed: () => void;
}) {
  const [customers, setCustomers] = useState<BulkCustomerJSON[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [paidNow, setPaidNow] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // When set, we are editing this saved bill instead of creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBillNo, setEditingBillNo] = useState<string>("");
  const [receipt, setReceipt] = useState<{
    billNo: string;
    dateStr: string;
    customerName: string;
    items: BulkLine[];
    total: number;
    paidNow: number;
    prevBalance: number;
    newBalance: number;
    paymentOnly: boolean;
  } | null>(null);

  async function loadCustomers() {
    try {
      const list = await fetchBulkCustomers();
      setCustomers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    }
  }

  useEffect(() => {
    (async () => {
      await loadCustomers();
    })();
  }, []);

  // Load a bill chosen for editing into the form, then clear it from the parent.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!editBill) return;
    setCustomerId(editBill.customerId);
    setEditingId(editBill._id);
    setEditingBillNo(editBill.billNo);
    setLines(
      editBill.items.length > 0
        ? editBill.items.map((it) => ({
            id: Math.random().toString(36).slice(2),
            name: it.name,
            unit: it.unit,
            qty: String(it.qty),
            price: String(it.price),
            mrp: it.mrp != null ? String(it.mrp) : "",
          }))
        : [newLine()]
    );
    setPaidNow(editBill.paidNow ? String(editBill.paidNow) : "");
    setReceipt(null);
    setError("");
    onEditConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBill]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setEditingId(null);
    setEditingBillNo("");
    setLines([newLine()]);
    setPaidNow("");
    setReceipt(null);
    setError("");
  }

  const selected = customers.find((c) => c._id === customerId) || null;

  const total = useMemo(
    () =>
      +lines
        .reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
        .toFixed(2),
    [lines]
  );

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.id !== id) : prev
    );
  }

  async function onCreateCustomer() {
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const c = await createBulkCustomer({ name, phone: newPhone.trim() });
      setCustomers((prev) =>
        [...prev, c].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(c._id);
      setCreatingCustomer(false);
      setNewName("");
      setNewPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  async function onSave() {
    setError("");
    setReceipt(null);
    if (!customerId) {
      setError("Please select or create a customer first");
      return;
    }
    const items: BulkLine[] = lines
      .filter((l) => l.name.trim() && Number(l.qty) > 0)
      .map((l) => {
        const qty = Number(l.qty);
        const price = Number(l.price) || 0;
        return {
          name: l.name.trim(),
          unit: l.unit,
          qty,
          price,
          mrp: l.mrp.trim() === "" ? undefined : Number(l.mrp),
          lineTotal: +(qty * price).toFixed(2),
        };
      });
    const paidAmt = Number(paidNow) || 0;
    const custName = selected?.name ?? "Customer";
    const prevBal = selected?.balance ?? 0;
    const nowStr = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Editing an existing saved bill.
    if (editingId) {
      if (items.length === 0) {
        setError("A bill must have at least one item");
        return;
      }
      setSaving(true);
      try {
        const res = await updateBulkBill(editingId, {
          customerId,
          items,
          paidNow: paidAmt,
        });
        const list = await fetchBulkCustomers();
        setCustomers(list);
        const updated = list.find((c) => c._id === customerId);
        const newBal = updated?.balance ?? prevBal;
        setReceipt({
          billNo: res.billNo,
          dateStr: nowStr,
          customerName: custName,
          items,
          total: res.total,
          paidNow: res.paidNow,
          prevBalance: +(newBal - res.total + res.paidNow).toFixed(2),
          newBalance: newBal,
          paymentOnly: false,
        });
        setEditingId(null);
        setEditingBillNo("");
        setLines([newLine()]);
        setPaidNow("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update bill");
      } finally {
        setSaving(false);
      }
      return;
    }

    // No items but money received → record a payment only (no bill).
    if (items.length === 0) {
      if (paidAmt <= 0) {
        setError(
          "Add at least one item, or enter an amount received to record a payment only"
        );
        return;
      }
      setSaving(true);
      try {
        const res = await recordBulkPayment({
          customerId,
          amount: paidAmt,
          note: "Payment received",
        });
        setReceipt({
          billNo: `PAY-${String(res.id).slice(-6).toUpperCase()}`,
          dateStr: nowStr,
          customerName: custName,
          items: [],
          total: 0,
          paidNow: paidAmt,
          prevBalance: prevBal,
          newBalance: +(prevBal - paidAmt).toFixed(2),
          paymentOnly: true,
        });
        setPaidNow("");
        await loadCustomers();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to record payment"
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await createBulkBill({
        customerId,
        items,
        paidNow: paidAmt,
      });
      setReceipt({
        billNo: res.billNo,
        dateStr: nowStr,
        customerName: custName,
        items,
        total: res.total,
        paidNow: res.paidNow,
        prevBalance: prevBal,
        newBalance: +(prevBal + res.total - res.paidNow).toFixed(2),
        paymentOnly: false,
      });
      setLines([newLine()]);
      setPaidNow("");
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setSaving(false);
    }
  }

  const hasItems = lines.some((l) => l.name.trim() && Number(l.qty) > 0);
  const paymentOnly = !hasItems && (Number(paidNow) || 0) > 0;

  const prevBalance = selected?.balance ?? 0;
  const newBalance = +(prevBalance + total - (Number(paidNow) || 0)).toFixed(2);

  if (receipt) {
    return (
      <BulkBill
        billNo={receipt.billNo}
        dateStr={receipt.dateStr}
        customerName={receipt.customerName}
        items={receipt.items}
        total={receipt.total}
        paidNow={receipt.paidNow}
        prevBalance={receipt.prevBalance}
        newBalance={receipt.newBalance}
        paymentOnly={receipt.paymentOnly}
        onNewBill={() => {
          resetForm();
        }}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {editingId && (
          <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
            <span className="font-medium text-amber-800">
              Editing saved bill {editingBillNo}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Cancel edit
            </button>
          </div>
        )}
        {/* Customer picker */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Customer
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">— Select customer —</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ""} · bal{" "}
                  {formatCurrency(c.balance ?? 0)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCreatingCustomer((v) => !v)}
              className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              {creatingCustomer ? "Cancel" : "+ New customer"}
            </button>
          </div>

          {creatingCustomer && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={onCreateCustomer}
                disabled={!newName.trim()}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {selected && (
            <p className="mt-2 text-sm text-gray-600">
              Previous outstanding balance:{" "}
              <span
                className={`font-semibold ${
                  prevBalance > 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {formatCurrency(prevBalance)}
              </span>
            </p>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Items</h2>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, newLine()])}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              + Add row
            </button>
          </div>

          <div className="space-y-2">
            {/* header (desktop) */}
            <div className="hidden gap-2 px-1 text-xs font-medium text-gray-500 sm:grid sm:grid-cols-[1fr_70px_70px_90px_90px_90px_28px]">
              <span>Item</span>
              <span>Unit</span>
              <span>Qty</span>
              <span>Price/unit</span>
              <span>MRP (opt)</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            {lines.map((l) => {
              const lineTotal =
                (Number(l.qty) || 0) * (Number(l.price) || 0);
              return (
                <div
                  key={l.id}
                  className="grid grid-cols-2 gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1fr_70px_70px_90px_90px_90px_28px] sm:border-0 sm:p-0"
                >
                  <input
                    value={l.name}
                    onChange={(e) => updateLine(l.id, { name: e.target.value })}
                    placeholder="Item name"
                    className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 sm:col-span-1"
                  />
                  <select
                    value={l.unit}
                    onChange={(e) =>
                      updateLine(l.id, { unit: e.target.value as ProductUnit })
                    }
                    className="rounded-md border border-gray-300 px-1 py-1.5 text-sm outline-none focus:border-emerald-500"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={l.qty}
                    onChange={(e) => updateLine(l.id, { qty: e.target.value })}
                    placeholder="Qty"
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={l.price}
                    onChange={(e) => updateLine(l.id, { price: e.target.value })}
                    placeholder="Price"
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={l.mrp}
                    onChange={(e) => updateLine(l.id, { mrp: e.target.value })}
                    placeholder="MRP"
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-end px-1 text-sm font-medium text-gray-700">
                    {formatCurrency(lineTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.id)}
                    aria-label="Remove row"
                    className="flex items-center justify-center rounded-md text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary / actions */}
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Bill total</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(total)}
            </span>
          </div>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            Amount received now
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={paidNow}
            onChange={(e) => setPaidNow(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          {selected && (
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Previous balance</span>
                <span>{formatCurrency(prevBalance)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>+ This bill</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>− Received now</span>
                <span>{formatCurrency(Number(paidNow) || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
                <span>Remaining balance</span>
                <span
                  className={
                    newBalance > 0 ? "text-red-600" : "text-emerald-700"
                  }
                >
                  {formatCurrency(newBalance)}
                </span>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={onSave}
            disabled={saving}
            className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Update bill"
                : paymentOnly
                  ? "Record payment (no bill)"
                  : "Create bill"}
          </button>
          {paymentOnly && !editingId && (
            <p className="mt-2 text-xs text-gray-500">
              No items added — this will only record the received amount against
              the customer&apos;s balance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Customers & ledger --------------------------- */

function Customers({
  onEditBill,
}: {
  onEditBill: (bill: BulkBillJSON) => void;
}) {
  const [customers, setCustomers] = useState<BulkCustomerJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchBulkCustomers();
      setCustomers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading customers…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (customers.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No bulk customers yet. Create one from the “New bill” tab.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((c) => (
        <div
          key={c._id}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <button
            onClick={() => setOpenId(openId === c._id ? null : c._id)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">
                {c.phone || "No phone"}
                {c.lastActivityAt
                  ? ` · last activity ${fmtDate(c.lastActivityAt)}`
                  : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Balance</p>
              <p
                className={`font-semibold ${
                  (c.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {formatCurrency(c.balance ?? 0)}
              </p>
            </div>
          </button>

          {openId === c._id && (
            <Ledger
              customerId={c._id}
              onChanged={load}
              onEditBill={onEditBill}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Ledger({
  customerId,
  onChanged,
  onEditBill,
}: {
  customerId: string;
  onChanged: () => void;
  onEditBill: (bill: BulkBillJSON) => void;
}) {
  const [ledger, setLedger] = useState<BulkLedger | null>(null);
  const [error, setError] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const l = await fetchBulkLedger(customerId);
      setLedger(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function onDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a deposit amount greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await recordBulkPayment({
        customerId,
        amount,
        note: depositNote.trim(),
      });
      setDepositAmount("");
      setDepositNote("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record deposit");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(billId: string) {
    if (
      !window.confirm(
        "Delete this bill? This also removes its 'paid at billing' amount and updates the balance. This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(billId);
    setError("");
    try {
      await deleteBulkBill(billId);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bill");
    } finally {
      setDeletingId(null);
    }
  }

  if (error && !ledger) {
    return <p className="mt-3 text-sm text-red-600">{error}</p>;
  }
  if (!ledger) {
    return <p className="mt-3 text-sm text-gray-500">Loading ledger…</p>;
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Total billed</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(ledger.totalBilled)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Total received</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(ledger.totalPaid)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Balance</p>
          <p
            className={`font-semibold ${
              ledger.balance > 0 ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {formatCurrency(ledger.balance)}
          </p>
        </div>
      </div>

      {/* Record deposit */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-emerald-50 p-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">
            Deposit received
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0"
            className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <input
          value={depositNote}
          onChange={(e) => setDepositNote(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <button
          onClick={onDeposit}
          disabled={saving}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record deposit"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {/* Statement */}
      <div className="space-y-1 text-sm">
        <h3 className="mb-1 font-semibold text-gray-800">Statement</h3>
        {ledger.bills.length === 0 && ledger.payments.length === 0 && (
          <p className="text-gray-500">No activity yet.</p>
        )}
        {ledger.bills.map((b) => (
          <div
            key={b._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-1.5"
          >
            <span className="text-gray-700">
              {fmtDate(b.createdAt)} · Bill {b.billNo} ({b.items.length} items)
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium text-red-700">
                + {formatCurrency(b.total)}
              </span>
              <button
                type="button"
                onClick={() => onEditBill(b)}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(b._id)}
                disabled={deletingId === b._id}
                className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === b._id ? "Deleting…" : "Delete"}
              </button>
            </span>
          </div>
        ))}
        {ledger.payments.map((p) => (
          <div
            key={p._id}
            className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-1.5"
          >
            <span className="text-gray-700">
              {fmtDate(p.createdAt)} · Payment{p.note ? ` · ${p.note}` : ""}
            </span>
            <span className="font-medium text-emerald-700">
              − {formatCurrency(p.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
