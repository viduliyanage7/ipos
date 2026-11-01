import { useEffect, useState } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import { formatDate } from "../CollectPayments/modals/formatters";

export default function StockLog() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    axios.get("http://localhost:3002/api/inventory/stock-log", { signal: controller.signal, params: range })
      .then(response => setTransactions(response.data.rows))
      .catch(err => {
        if (!controller.signal.aborted) setError(err.response?.data?.message || "Couldn't load stock additions. Try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, range]);

  const filtered = transactions.filter(row =>
    `${row.transaction_id} ${row.product_id} ${row.product_name || ""} ${row.category_name || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Stock Log</h1>
            <p className="mt-1 text-sm text-slate-500">{range.from || range.to ? "Showing stock additions in the selected date range, newest first." : "Showing the latest 25 stock additions. Select a date range to view older records."}</p>
          </div>
          <button disabled={loading} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh
          </button>
        </div>
        {error && <div role="alert" className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={event => {
          event.preventDefault();
          if (from && to && from > to) {
            setError("From date must be on or before To date.");
            return;
          }
          setRange({ from, to });
        }}>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
            From date
            <input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
            To date
            <input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <button disabled={loading} type="submit" className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Apply filter</button>
          <button disabled={loading} type="button" onClick={() => { setFrom(""); setTo(""); setSearch(""); setRange({ from: "", to: "" }); }} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">Reset</button>
        </form>
        <label className="mt-6 flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Search stock additions
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search product, category or transaction ID…" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500"><tr>
              {["Transaction", "Product", "Category", "Quantity added", "Type", "Added at"].map(label => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}
            </tr></thead>
            <tbody>
              {loading || error ? <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">{loading ? "Loading stock additions…" : "Stock additions could not be loaded. Please retry."}</td></tr> : filtered.length ? filtered.map(row => (
                <tr key={row.transaction_id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-emerald-50/40">
                  <td className="px-5 py-3.5 font-medium text-slate-700">#{row.transaction_id}</td>
                  <td className="px-5 py-3.5 text-slate-600">{row.product_name || `Product #${row.product_id}`}</td>
                  <td className="px-5 py-3.5 text-slate-600">{row.category_name || "—"}</td>
                  <td className="px-5 py-3.5 font-semibold tabular-nums text-emerald-700">+{row.quantity}</td>
                  <td className="px-5 py-3.5"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{row.transaction_type || "Restock"}</span></td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(row.transaction_date)}</td>
                </tr>
              )) : <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">{search || range.from || range.to ? "No matching stock additions." : "No stock additions recorded yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
