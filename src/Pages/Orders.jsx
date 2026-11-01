import { useEffect, useState } from "react";
import axios from "axios";
import "./Orders.css";
import { Checkbox, ConfigProvider, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { Eye, RefreshCw, X } from "lucide-react";
import { formatCurrency as money, formatDate as date } from "../CollectPayments/modals/formatters";

const api = "http://localhost:3002/api/orders";
const normalizePhone = value => String(value || "").replace(/\D/g, "").replace(/^0+/, "");
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const paymentStatus = order => Number(order.paid_amount) >= Number(order.total) ? "Paid" : Number(order.paid_amount) > 0 ? "Partially paid" : "Unpaid";
const inputStyle = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export default function Orders() {
  const [filters, setFilters] = useState(() => ({ from: today(), to: today(), status: "all" }));
  const [query, setQuery] = useState(filters);
  const [useDates, setUseDates] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    axios.get(api, { params: query, signal: controller.signal })
      .then(response => setOrders(response.data.rows))
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || "Couldn't load orders. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    axios.get(`${api}/${selectedId}`, { signal: controller.signal })
      .then(response => setDetail(response.data.data))
      .catch(err => { if (!controller.signal.aborted) setDetailError(err.response?.data?.message || "Couldn't load details."); });
    const onKey = event => { if (event.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => { controller.abort(); window.removeEventListener("keydown", onKey); };
  }, [selectedId]);

  const apply = event => {
    event.preventDefault();
    if (useDates && filters.from && filters.to && filters.from > filters.to) { setError("From date must be on or before the To date."); return; }
    setLoading(true); setError(""); setQuery({ ...filters, from: useDates ? filters.from : "", to: useDates ? filters.to : "" });
  };
  const filtered = orders.filter(order => `${order.order_number} ${order.customer_name || ""} ${order.customer_phone || ""}`.toLowerCase().includes(search.toLowerCase()) && normalizePhone(order.customer_phone).includes(normalizePhone(phone)));

  return <div className="min-h-full bg-white"><div className="mx-auto max-w-7xl px-6 py-8">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold text-slate-800">Orders</h1><p className="mt-1 text-sm text-slate-500">View orders, items and payment history. Dates use Sri Lanka time.</p></div>
      <button disabled={loading} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} className={`${inputStyle} inline-flex items-center gap-2 disabled:opacity-60`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></div>
    <ConfigProvider theme={{ token: { colorPrimary: "#059669", colorBorder: "#e2e8f0", colorText: "#334155", borderRadius: 8, controlHeight: 40, fontSize: 14 }, components: { Select: { optionSelectedBg: "#ecfdf5", optionSelectedColor: "#047857" } } }}>
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Checkbox checked={useDates} onChange={e => {
        const enabled = e.target.checked;
        setUseDates(enabled); setLoading(true); setError("");
        setQuery({ ...filters, from: enabled ? filters.from : "", to: enabled ? filters.to : "" });
      }}>Filter by date</Checkbox>
      <span className="text-xs text-slate-500">Turn off to search all dates by order number or phone.</span>
    </div>
    <form onSubmit={apply} className="orders-filter-bar mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="orders-from-date" className="text-xs font-medium text-slate-500">From date</label>
        <DatePicker id="orders-from-date" disabled={!useDates} value={filters.from ? dayjs(filters.from) : null} format="DD/MM/YYYY" allowClear
          onChange={value => setFilters({ ...filters, from: value ? value.format("YYYY-MM-DD") : "" })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="orders-to-date" className="text-xs font-medium text-slate-500">To date</label>
        <DatePicker id="orders-to-date" disabled={!useDates} value={filters.to ? dayjs(filters.to) : null} format="DD/MM/YYYY" allowClear
          disabledDate={value => Boolean(filters.from) && value.isBefore(dayjs(filters.from), "day")}
          onChange={value => setFilters({ ...filters, to: value ? value.format("YYYY-MM-DD") : "" })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="order-payment-status" className="text-xs font-medium text-slate-500">Payment status</label>
          <Select
            id="order-payment-status"
            value={filters.status}
            onChange={status => setFilters({ ...filters, status })}
            style={{ width: 180, height: 40 }}
            options={[
              { value: "all", label: "All statuses" },
              { value: "unpaid", label: "Unpaid" },
              { value: "partial", label: "Partially paid" },
              { value: "paid", label: "Paid" },
            ]}
          />
      </div>
      <div className="orders-filter-action">
        <span aria-hidden="true" className="orders-filter-spacer">&nbsp;</span>
        <button type="submit" className="rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700">Apply filters</button>
      </div>
    </form>
    </ConfigProvider>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Search orders
        <input aria-label="Search orders" placeholder="Search order number or customer…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputStyle} h-10 w-full`} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Customer phone number
        <input type="tel" inputMode="tel" placeholder="Enter customer phone number…" value={phone} onChange={e => setPhone(e.target.value)} className={`${inputStyle} h-10 w-full`} />
      </label>
    </div>
    <p className="mt-4 text-sm text-slate-500">{loading ? "Loading orders…" : `${filtered.length} orders · Total ${money(filtered.reduce((sum, order) => sum + Number(order.total), 0))}`}</p>
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500"><tr>{["Order", "Customer", "Created At", "Total", "Paid", "Balance", "Payment status", "Action"].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>
      {loading || error ? <tr><td colSpan={8} className="p-12 text-center text-slate-400">{loading ? "Loading orders…" : "Orders could not be loaded. Please retry."}</td></tr> : !filtered.length ? <tr><td colSpan={8} className="p-12 text-center text-slate-400">No orders match these filters.</td></tr> : filtered.map(order => <tr key={order.order_id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-emerald-50/40">
        <td className="px-4 py-3.5 font-medium text-slate-700">{order.order_number}</td><td className="px-4 py-3.5 text-slate-600">{order.customer_name || "—"}<p className="text-xs text-slate-400">{order.customer_phone}</p></td><td className="px-4 py-3.5 text-slate-600">{date(order.created_at)}</td>{[order.total, order.paid_amount, order.outstanding_amount].map((amount, i) => <td key={i} className="px-4 py-3.5 text-slate-600">{money(amount)}</td>)}<td className="px-4 py-3.5"><Status order={order} /></td><td className="px-4 py-3.5"><button aria-label={`View order ${order.order_number}`} onClick={() => { setDetail(null); setDetailError(""); setSelectedId(order.order_id); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-100"><Eye size={15} />View</button></td>
      </tr>)}
    </tbody></table></div>
  </div>
    {selectedId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setSelectedId(null)}><div role="dialog" aria-modal="true" aria-labelledby="order-details-title" className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 id="order-details-title" className="text-lg font-semibold text-slate-800">Order {detail ? `#${detail.order_number}` : "details"}</h2><button autoFocus aria-label="Close order details" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><X size={20} /></button></div>
      <div className="overflow-y-auto p-6">{detailError ? <p role="alert" className="text-red-600">{detailError}</p> : !detail ? <p className="text-slate-400">Loading order details…</p> : <>
        <div className="mb-5"><Status order={detail} /></div>
        <dl className="grid grid-cols-2 gap-4 text-sm">{[["Customer", detail.customer_name], ["Phone", detail.customer_phone], ["Vehicle", detail.vehicle_no], ["Location", detail.location], ["Created", date(detail.created_at)], ["Updated", date(detail.updated_at)], ["Created by", detail.created_by || `User #${detail.user_id}`], ["Order ID", detail.order_id]].map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-700">{value || "—"}</dd></div>)}</dl>
        <h3 className="mb-3 mt-6 font-semibold text-slate-800">Order items</h3><div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{["Item", "Quantity", "Unit price", "Amount"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{detail.items.map((item, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3 text-slate-700">{item.product_name || `Product #${item.product_id}`}<p className="text-xs text-slate-400">{item.category_name}{item.is_custom ? " item" : ""}</p></td><td className="p-3">{item.quantity}</td><td className="p-3">{money(item.unit_price)}</td><td className="p-3">{money(Number(item.quantity) * Number(item.unit_price))}</td></tr>)}{!detail.items.length && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No recorded items.</td></tr>}</tbody></table></div>
        <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{[["Order total", detail.total], ["Total paid", detail.paid_amount], ["Outstanding balance", detail.outstanding_amount]].map(([label, amount]) => <div key={label} className="flex justify-between"><span>{label}</span><strong>{money(amount)}</strong></div>)}</div>
        <h3 className="mb-3 mt-6 font-semibold text-slate-800">Payment history</h3>{!detail.payments.length ? <p className="text-sm text-slate-400">No payments recorded.</p> : <ul className="divide-y divide-slate-100">{detail.payments.map(payment => <li key={payment.payment_id} className="flex justify-between gap-4 py-3 text-sm"><div><p className="text-slate-700">{date(payment.payment_time)} · {payment.payment_method || "Unknown method"}</p><p className="mt-1 text-xs text-slate-400">Payment #{payment.payment_id} · Received by {payment.received_by || `User #${payment.user_id}`}{payment.bank_reference || payment.reference_no ? ` · Ref: ${payment.bank_reference || payment.reference_no}` : ""}</p></div><strong className="whitespace-nowrap text-slate-700">{money(payment.amount)}</strong></li>)}</ul>}
      </>}</div>
    </div></div>}
  </div>;
}

function Status({ order }) {
  const label = paymentStatus(order);
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${label === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{label}</span>;
}
