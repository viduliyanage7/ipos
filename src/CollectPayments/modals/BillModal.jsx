import React, { useState } from "react";
import { X, Receipt, CheckCircle2, Printer } from "lucide-react";
import { formatDate, formatCurrency } from "./formatters";
import { buildReceiptHtml } from "./receiptTemplate";

const BillModal = ({ receipt, onClose }) => {
  const { order, amountDue, amountPaid, balance } = receipt;

  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  const handlePrint = async () => {
    setPrintError("");
    setPrinting(true);
    try {
      const html = buildReceiptHtml(receipt /*, { name: "My Shop", ... } */);
      // Omit deviceName to use the OS default printer, or pass the exact
      // name returned by window.electronAPI.getPrinters() to target a
      // specific thermal printer.
      const result = await window.electronAPI.printReceipt(html);
      if (!result?.success && !result?.cancelled) {
        setPrintError(
          result?.error
            ? `Print failed: ${result.error}`
            : "Print failed. Check the printer connection.",
        );
      }
    } catch (err) {
      setPrintError("Could not reach the printer service.");
    } finally {
      setPrinting(false);
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
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Payment recorded
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

        {/* Bill details */}
        <div className="mt-7 flex items-center gap-2 border-b border-dashed border-slate-200 pb-4">
          <Receipt className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-500">
            Bill summary
          </span>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Customer</dt>
            <dd className="font-medium text-slate-700">
              {order.customer_name || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Order date</dt>
            <dd className="font-medium text-slate-700">
              {formatDate(order.created_at)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Amount due</dt>
            <dd className="font-medium text-slate-700">
              {formatCurrency(amountDue)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Amount paid</dt>
            <dd className="font-medium text-slate-700">
              {formatCurrency(amountPaid)}
            </dd>
          </div>
        </dl>

        {/* Balance callout */}
        <div
          className={`mt-5 rounded-xl px-4 py-3.5 text-sm ${
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
              carried forward to a future bill.
            </>
          ) : balance < 0 ? (
            <>
              <span className="font-semibold">
                {formatCurrency(Math.abs(balance))} change
              </span>{" "}
              returned to the customer.
            </>
          ) : (
            <span className="font-semibold">Bill fully settled.</span>
          )}
        </div>

        {printError && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            {printError}
          </div>
        )}

        <div className="mt-7 flex gap-3">
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {printing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {printing ? "Printing..." : "Print bill"}
          </button>

          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
