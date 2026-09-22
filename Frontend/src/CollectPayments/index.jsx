import axios from "axios";
import React, { useEffect, useState } from "react";
import { RefreshCw, Inbox, Wallet } from "lucide-react";
import { formatDate, formatCurrency } from "./modals/formatters";
import PaymentModal from "./modals/PaymentModal";
import BillModal from "./modals/BillModal";

const CollectPayment = (props) => {
  const { userId } = props;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        "http://localhost:3002/api/collect-payment/fetch-all",
      );

      setOrders(response.data.rows || []);
    } catch (err) {
      console.error("Error fetching orders:", err);

      setError(
        err.response?.data?.message ||
          "Couldn't load orders. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (order, amountPaid) => {
    if (paymentLoading) {
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const amountDue = Number(order.total_due);
      const paid = Number(amountPaid);

      if (!Number.isFinite(amountDue) || amountDue <= 0) {
        throw new Error("Invalid order amount.");
      }

      if (!Number.isFinite(paid) || paid < 0) {
        throw new Error("Invalid payment amount.");
      }

      const response = await axios.post(
        "http://localhost:3002/api/collect-payment/complete-payment",
        {
          order_id: order.order_id,
          customer_id: order.customer_id,
          payment: paid || 0,
          amountDue: amountDue,
          userId: userId,
        },
      );

      const paymentResult = response.data.data;

      setSelectedOrder(null);

      setReceipt({
        order,
        amountDue: Number(paymentResult?.amountDue) || amountDue,
        amountPaid: Number(paymentResult?.amountPaid) || paid,
        balance:
          Number(paymentResult?.balance) || Math.max(amountDue - paid, 0),
      });

      await fetchData();
    } catch (err) {
      console.error("Payment failed:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to process payment.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Collect Payment
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review outstanding and completed orders, and collect payment
              against them.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading || paymentLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 font-semibold text-slate-500">
                    Order Number
                  </th>

                  <th className="px-5 py-3 font-semibold text-slate-500">
                    Customer Name
                  </th>

                  <th className="px-5 py-3 font-semibold text-slate-500">
                    Total
                  </th>

                  <th className="px-5 py-3 font-semibold text-slate-500">
                    Created At
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-slate-400"
                    >
                      Loading orders…
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order, idx) => (
                    <tr
                      key={order.order_id}
                      className={`border-b border-slate-100 last:border-0 ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      } transition-colors hover:bg-emerald-50/40`}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {order.order_number}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {order.customer_name}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {formatCurrency(order.bill_total)}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(order.created_at)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          disabled={paymentLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Collect Payment
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-16">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                          <Inbox className="h-5 w-5 text-slate-400" />
                        </div>

                        <p className="font-medium text-slate-600">
                          No orders found
                        </p>

                        <p className="text-sm text-slate-400">
                          Orders will appear here once a bill is created.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && !error && orders.length > 0 && (
          <p className="mt-4 text-center text-sm text-slate-400">
            Showing {orders.length} order
            {orders.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      {selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          onClose={() => {
            if (!paymentLoading) {
              setSelectedOrder(null);
            }
          }}
          onConfirm={handleConfirmPayment}
          loading={paymentLoading}
        />
      )}

      {receipt && (
        <BillModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
};

export default CollectPayment;
