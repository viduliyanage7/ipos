import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { RefreshCw, Wallet } from "lucide-react";
import PaymentModal from "../CollectPayments/modals/PaymentModal";
import { formatCurrency, formatDate } from "../CollectPayments/modals/formatters";

const api = "http://localhost:3002/api/collect-payment";
const normalizePhone = value => String(value || "").replace(/\D/g, "").replace(/^0+/, "");

export default function PendingPayments({ userId, setToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const saving = useRef(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${api}/pending`);
      setOrders(response.data.rows);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load pending payments. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${api}/pending`, { signal: controller.signal })
      .then(response => setOrders(response.data.rows))
      .catch(err => {
        if (!controller.signal.aborted) setError(err.response?.data?.message || "Couldn't load pending payments. Try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const settle = async (order, amount) => {
    if (saving.current) return;
    if (!userId) throw new Error("Please sign in before recording a payment.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
    saving.current = true;
    try {
      const response = await axios.post(`${api}/settle-pending`, {
        order_id: order.order_id, payment: amount, userId,
      });
      setSelected(null);
      setToast(response.data.balance === 0 ? "Order fully settled" : "Partial payment recorded");
      await load();
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Couldn't save payment.", { cause: err });
    } finally {
      saving.current = false;
    }
  };

  const filtered = orders.filter(order =>
    `${order.order_number} ${order.customer_name || ""} ${order.customer_phone || ""}`.toLowerCase().includes(search.toLowerCase()) &&
    normalizePhone(order.customer_phone).includes(normalizePhone(phone)),
  );

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Pending Payments</h1>
            <p className="mt-1 text-sm text-slate-500">Review unpaid balances and settle an order partially or in full.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {error && <div role="alert" className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
            Search orders
            <input aria-label="Search pending orders" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number or customer…" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
            Customer phone number
            <input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter customer phone number…" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </label>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500"><tr>
              {["Order Number", "Customer", "Total", "Paid", "Outstanding", "Created At", "Action"].map(label => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-400">Loading pending payments…</td></tr> : filtered.length ? filtered.map(order => (
                <tr key={order.order_id} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/40 hover:bg-emerald-50/40">
                  <td className="px-5 py-3.5 font-medium text-slate-700">{order.order_number}</td>
                  <td className="px-5 py-3.5 text-slate-600">{order.customer_name || "—"}<p className="mt-1 text-xs text-slate-400">{order.customer_phone}</p></td>
                  <td className="px-5 py-3.5 text-slate-600">{formatCurrency(order.bill_total)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatCurrency(order.paid_amount)}</td>
                  <td className="px-5 py-3.5 font-semibold text-amber-700">{formatCurrency(order.outstanding_amount)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-3.5"><button onClick={() => setSelected(order)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><Wallet size={14} /> Settle payment</button></td>
                </tr>
              )) : <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-400">{search || phone ? "No matching orders." : "No pending payments."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {selected && <PaymentModal key={selected.order_id} settlement orderDetails={{ ...selected, total_due: Number(selected.outstanding_amount) }} onClose={() => { if (!saving.current) setSelected(null); }} onConfirm={settle} />}
    </div>
  );
}
