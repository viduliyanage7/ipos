import { useEffect, useState } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";

function currentMonth() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${lastDay}` };
}
const inputStyle = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-400";
const quantity = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });

export default function SalesSummary() {
  const [filters, setFilters] = useState(currentMonth);
  const [range, setRange] = useState(filters);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    axios.get("http://localhost:3002/api/sales-summary", { params: range, signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) { setRows(response.data.rows); setPage(1); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || "Couldn't load product sales. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, refresh]);

  const categories = Array.from(new Map(rows.map(row => [row.category_key, row.category_name])).entries());
  const filtered = rows.filter(row => (!category || row.category_key === category) &&
    `${row.product_name} ${row.category_name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalQuantity = filtered.reduce((sum, row) => sum + Number(row.quantity_sold), 0);

  return <div className="min-h-full bg-white"><div className="mx-auto max-w-7xl px-6 py-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-slate-800">Summary</h1>
        <p className="mt-1 text-sm text-slate-500">Products sold by category and bill date. Includes paid and unpaid bills; dates use Sri Lanka time.</p></div>
      <button disabled={loading} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} className={`${inputStyle} inline-flex items-center gap-2 disabled:opacity-60`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
    </div>
    <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4" onSubmit={event => {
      event.preventDefault();
      if (!filters.from || !filters.to || filters.from > filters.to) { setError("Select a valid From and To date range."); return; }
      setLoading(true); setError(""); setRange({ ...filters });
    }}>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">From date<input required type="date" value={filters.from} max={filters.to || undefined} onChange={event => setFilters({ ...filters, from: event.target.value })} className={inputStyle} /></label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">To date<input required type="date" value={filters.to} min={filters.from || undefined} onChange={event => setFilters({ ...filters, to: event.target.value })} className={inputStyle} /></label>
      <button disabled={loading} className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Apply filters</button>
      <button type="button" disabled={loading} onClick={() => { const month = currentMonth(); setLoading(true); setError(""); setFilters(month); setRange(month); }} className={`${inputStyle} disabled:opacity-60`}>Current month</button>
    </form>
    <p className="mt-4 text-sm text-slate-500">{range.from} to {range.to}</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading ? <p role="status" className="py-14 text-center text-slate-400">Loading product sales…</p> : !error && <>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-col gap-1.5 text-xs font-medium text-slate-500">Category
          <select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} className={inputStyle}>
            <option value="">All categories</option>
            {categories.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500">Search products
          <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search product or category…" className={inputStyle} />
        </label>
        {(category || search) && <button className={inputStyle} onClick={() => { setCategory(""); setSearch(""); setPage(1); }}>Clear search & category</button>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>{filtered.length} products · {category ? "Selected category" : `${categories.length} categories`}</span>
        <span>Quantity sold: <strong className="text-emerald-700">{quantity(totalQuantity)}</strong></span>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
        <div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[500px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">Category</th><th className="px-5 py-3">Product name</th><th className="px-5 py-3 text-right">Quantity sold</th></tr></thead>
          <tbody>{visible.map((product, index) => <tr key={index} className="border-t border-slate-100 even:bg-slate-50/40 hover:bg-emerald-50/40">
            <td className="px-5 py-3 text-slate-500">{product.category_name}</td>
            <td className="px-5 py-3 font-medium text-slate-700">{product.product_name}</td>
            <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700">{quantity(product.quantity_sold)}</td>
          </tr>)}{!visible.length && <tr><td colSpan={3} className="px-5 py-14 text-center text-slate-400">{rows.length ? "No products match your search or category." : "No products sold in this date range."}</td></tr>}</tbody>
        </table></div>
        {filtered.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-3">
            <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={`${inputStyle} disabled:opacity-40`}>Previous</button>
            <span>Page {currentPage} of {pageCount}</span>
            <button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className={`${inputStyle} disabled:opacity-40`}>Next</button>
          </div>
        </div>}
      </div>
    </>}
  </div></div>;
}
