import React, { useState } from "react";
import { X, Wallet } from "lucide-react";
import { formatCurrency } from "./formatters";

const PaymentModal = ({ order, onClose, onConfirm }) => {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const amountDue = Number(order.total_due) || 0;
  const lastBillsTotal = Number(order.pre_bills_total) || 0;
  const currentBill = Number(order.bill_total) || 0;
  const amountPaid = parseFloat(amount);
  const hasValidAmount = amount !== "" && !isNaN(amountPaid) && amountPaid >= 0;
  const balance = hasValidAmount ? amountDue - amountPaid : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasValidAmount) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(order, amountPaid);
    } catch (err) {
      console.error("Error collecting payment:", err);
      setError("Couldn't save the payment. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Collect payment
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Order #{order.order_number}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {lastBillsTotal > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-500">
              Last Bill
            </span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(lastBillsTotal)}
            </span>
          </div>
        )}

        {currentBill !== amountDue && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-500">
              Current Bill
            </span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(currentBill)}
            </span>
          </div>
        )}

        {/* Amount due summary */}
        <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-500">Amount due</span>
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(amountDue)}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mt-6 block text-sm font-medium text-slate-700">
            Amount paid by customer
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 1500.00"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />

          {/* Live balance feedback */}
          {hasValidAmount && (
            <div
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                balance > 0
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : balance < 0
                    ? "border border-sky-200 bg-sky-50 text-sky-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {balance > 0 ? (
                <>
                  <span className="font-semibold">
                    {formatCurrency(balance)} due balance
                  </span>{" "}
                  will be added to a future bill.
                </>
              ) : balance < 0 ? (
                <>
                  <span className="font-semibold">
                    {formatCurrency(Math.abs(balance))} change
                  </span>{" "}
                  should be returned to the customer.
                </>
              ) : (
                <span className="font-semibold">
                  Bill fully paid. No balance remaining.
                </span>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Confirm payment"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
