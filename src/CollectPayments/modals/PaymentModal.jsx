import { useState, useEffect } from "react";
import { X, Wallet, Banknote, Landmark, Check, ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "./formatters";
import axios from "axios";

const PaymentModal = ({ orderDetails, onClose, onConfirm, settlement = false }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const isBankTransfer = !settlement && paymentMethod === "bank_transfer";
  const [submitting, setSubmitting] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState(false);
  const [error, setError] = useState(null);

  // Current bill
  const currentBill = Number(orderDetails.bill_total) || 0;

  // Previous bill information
  const previousBillTotal = Number(orderDetails.previous_bill_total) || 0;
  const previousPaidTotal = Number(orderDetails.previous_paid_total) || 0;
  const previousBills = Array.isArray(orderDetails.previous_bills)
    ? orderDetails.previous_bills
    : [];

  // Outstanding amount from previous bills
  const previousBalance =
    Number(orderDetails.previous_balance) ||
    Math.max(previousBillTotal - previousPaidTotal, 0);

  // Total amount customer currently owes
  const amountDue =
    Number(orderDetails.total_due) ||
    Number(orderDetails.total_payable) ||
    currentBill + previousBalance;

  const amountPaid = Number.parseFloat(amount);

  const hasValidAmount =
    amount !== "" && Number.isFinite(amountPaid) && (settlement ? amountPaid > 0 : amountPaid >= 0);

  const balance = hasValidAmount ? (Math.round(amountDue * 100) - Math.round(amountPaid * 100)) / 100 : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasValidAmount) {
      setError("Enter a valid amount.");
      return;
    }

    if ((settlement || isBankTransfer) && amountPaid > amountDue) {
      setError(
        `Payment cannot exceed the amount due of ${formatCurrency(amountDue)}.`,
      );
      return;
    }

    if (isBankTransfer && (!/^\d{1,12}$/.test(reference) || amountPaid <= 0)) {
      setError("Enter a bank reference of 1–12 digits and a positive transfer amount.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await onConfirm(orderDetails, amountPaid, billItems, { payment_method: paymentMethod, reference_number: isBankTransfer ? reference : undefined });
    } catch (err) {
      console.error("Error collecting payment:", err);
      setError(err.response?.data?.message || err.message || "Couldn't save the payment. Try again.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchBillItems = async () => {
      setItemsLoading(true);
      setItemsError(false);

      try {
        const response = await axios.get(
          `http://localhost:3002/api/collect-payment/fetch-bill-items`,
          { params: { orderID: orderDetails.order_id } },
        );

        if (!cancelled) setBillItems(response.data.rows || []);
      } catch (err) {
        console.error("Error fetching bill items:", err);
        if (!cancelled) setItemsError(true);
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    };

    fetchBillItems();

    return () => {
      cancelled = true;
    };
  }, [orderDetails.order_id]);

  const itemCount = billItems.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Collect payment
              </h2>
              <p className="text-sm text-slate-500">
                Order #{orderDetails.order_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Bill items */}
          <section aria-label="Bill items">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Bill items
              </h3>
              {!itemsLoading && billItems.length > 0 && (
                <span className="text-xs text-slate-400">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              {/* Column heads */}
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
                <span>Item</span>
                <span>Amount</span>
              </div>

              <div className="max-h-52 overflow-y-auto">
                {itemsLoading ? (
                  <ul className="divide-y divide-slate-100" aria-busy="true">
                    {[0, 1, 2].map((n) => (
                      <li
                        key={n}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="space-y-2">
                          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                          <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
                        </div>
                        <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
                      </li>
                    ))}
                  </ul>
                ) : itemsError ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    Couldn't load the items for this bill.
                  </p>
                ) : billItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    No items on this bill.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {billItems.map((item, index) => {
                      const qty = Number(item.qty) || 0;
                      const price = Number(item.price) || 0;

                      return (
                        <li
                          key={index}
                          className="grid grid-cols-[1fr_auto] items-start gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {item.productName}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                              {qty} × {formatCurrency(price)}
                            </p>
                          </div>

                          <span className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatCurrency(qty * price)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Current bill subtotal */}
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">
                  Current bill
                </span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(currentBill)}
                </span>
              </div>
            </div>
          </section>

          {/* Previous balance */}
          {previousBalance > 0 && (
            <details key={orderDetails.order_id} className="group mt-4 rounded-xl border border-amber-100 bg-amber-50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-amber-700">
                  Previous balance
                </span>
                <span className="flex items-center gap-3 text-sm font-bold tabular-nums text-amber-800">
                  {formatCurrency(previousBalance)}
                  <ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
                </span>
              </summary>

              {previousBillTotal > 0 && (
                <div className="mx-4 space-y-1 border-t border-amber-200/60 py-3 text-xs tabular-nums text-amber-700">
                  <div className="max-h-28 space-y-1 overflow-y-auto">
                    {previousBills.length > 0 ? (
                      previousBills.map((bill) => (
                        <div
                          key={bill.order_id}
                          className="flex justify-between"
                        >
                          <span>{formatDate(bill.created_at)}</span>
                          <span>{formatCurrency(bill.total)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between">
                        <span>Previous bills</span>
                        <span>{formatCurrency(previousBillTotal)}</span>
                      </div>
                    )}
                  </div>

                  {previousPaidTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Already paid</span>
                      <span>- {formatCurrency(previousPaidTotal)}</span>
                    </div>
                  )}
                </div>
              )}
            </details>
          )}

          {settlement && <div className="mt-4 flex justify-between text-sm text-slate-600"><span>Already paid on this order</span><span>{formatCurrency(orderDetails.paid_amount)}</span></div>}

          {/* Total amount due */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
            <span className="text-sm font-semibold text-emerald-700">
              Total amount due
            </span>
            <span className="text-lg font-bold tabular-nums text-emerald-800">
              {formatCurrency(amountDue)}
            </span>
          </div>
        </div>

        {/* Payment form (fixed footer) */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-100 bg-white px-6 py-5"
        >
          {!settlement && <fieldset disabled={submitting} className="mb-4">
            <legend className="mb-2 text-sm font-medium text-slate-700">Payment method</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "cash", label: "Cash", icon: Banknote },
                { value: "bank_transfer", label: "Bank transfer", icon: Landmark },
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="relative cursor-pointer">
                  <input type="radio" name="payment-method" value={value} checked={paymentMethod === value}
                    onChange={() => { setPaymentMethod(value); setError(null); }}
                    className="peer sr-only" />
                  <span className="flex h-14 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-emerald-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
                    <Icon size={20} className="shrink-0" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${paymentMethod === value ? "bg-emerald-600 text-white" : "border border-slate-300"}`}>
                      {paymentMethod === value && <Check size={11} strokeWidth={3} />}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="relative mt-3">
            <label aria-hidden={!isBankTransfer} className={`block text-sm font-medium text-slate-700 ${isBankTransfer ? "" : "invisible"}`}>Reference number
              <input required={isBankTransfer} disabled={!isBankTransfer || submitting} type="text" inputMode="numeric" pattern="[0-9]{1,12}" maxLength={12} value={reference} onChange={e => { setReference(e.target.value.replace(/\D/g, "").slice(0, 12)); setError(null); }} placeholder="Up to 12 digits" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </label>
            {!isBankTransfer && <div className="absolute inset-0 flex items-center gap-3 rounded-lg bg-slate-50 px-3 text-xs leading-relaxed text-slate-500">
              <Banknote size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
              <p>Enter the cash received below. Any change will be calculated automatically.</p>
            </div>}
            </div>
          </fieldset>}
          <label
            htmlFor="amount-paid"
            className="block text-sm font-medium text-slate-700"
          >
            Amount paid by customer
          </label>

          {settlement && <button type="button" disabled={submitting} onClick={() => setAmount(amountDue.toFixed(2))} className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">Pay full balance</button>}

          <input
            disabled={submitting}
            id="amount-paid"
            type="number"
            step="0.01"
            min={settlement || isBankTransfer ? "0.01" : "0"}
            max={settlement || isBankTransfer ? amountDue : undefined}
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 1500.00"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tabular-nums text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />

          {/* Remaining balance */}
          <div className="mt-3 flex h-16 items-center" aria-live="polite" aria-atomic="true">
          {hasValidAmount ? (
            <div
              className={`max-h-full w-full overflow-y-auto rounded-xl px-4 py-3 text-sm ${
                balance > 0
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : balance === 0
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : settlement || isBankTransfer ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {balance > 0 ? (
                <>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(balance)}
                  </span>{" "}
                  remaining balance.
                </>
              ) : balance === 0 ? (
                <span className="font-semibold">
                  Bill fully paid. No balance remaining.
                </span>
              ) : (
                <span className="font-semibold">
                  {settlement || isBankTransfer ? "Payment exceeds the amount due." : `${formatCurrency(Math.abs(balance))} change to return to customer.`}
                </span>
              )}
            </div>
          ) : <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Enter an amount to see the {settlement || isBankTransfer ? "remaining balance" : "remaining balance or change"}.
          </div>}
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !hasValidAmount}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Confirm payment"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
