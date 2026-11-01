import { useEffect, useState } from "react";
import axios from "axios";
import { Database, Save } from "lucide-react";

const api = "http://localhost:3002/api/settings";

export default function Settings({ embedded = false }) {
  const [host, setHost] = useState("");
  const [savedHost, setSavedHost] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(api, { signal: controller.signal })
      .then(response => { setHost(response.data.dbHost); setSavedHost(response.data.dbHost); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || "Couldn't load settings. Check that the backend is running."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  const save = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await axios.put(api, { dbHost: host.trim() });
      setHost(response.data.dbHost); setSavedHost(response.data.dbHost);
      setMessage("Database host saved on this computer and applied to new connections.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save settings. Try again.");
    } finally { setSaving(false); }
  };

  return <div className={embedded ? "bg-white" : "min-h-full bg-white"}><div className={embedded ? "" : "mx-auto max-w-7xl px-6 py-8"}>
    {!embedded && <><h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
    <p className="mt-1 text-sm text-slate-500">Manage settings for this computer.</p></>}
    <section className={embedded ? "py-4" : "mt-8 max-w-xl rounded-xl border border-slate-100 p-6"}>
      <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Database size={20} /></div><div><h2 className="font-semibold text-slate-800">Database connection</h2><p className="mt-1 text-xs text-slate-500">Saved locally and kept when you reopen the app.</p></div></div>
      <form onSubmit={save} className="mt-6">
        <label htmlFor="db-host" className="text-sm font-medium text-slate-700">Database host</label>
        <input id="db-host" required autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={loading || saving} value={host} onChange={event => { setHost(event.target.value); setMessage(""); }} placeholder="localhost or 192.168.1.100" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
        <p className="mt-2 text-xs text-slate-500">Enter a hostname or IP address without a protocol or port. Default: localhost.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {loading ? <p className="mt-4 text-sm text-slate-400">Loading settings…</p> : !savedHost ? <button type="button" onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} className="mt-4 text-sm font-medium text-emerald-600">Retry loading settings</button> : null}
        <button disabled={loading || saving || !savedHost || !host.trim() || host.trim() === savedHost} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><Save size={16} />{saving ? "Saving…" : "Save changes"}</button>
      </form>
    </section>
  </div></div>;
}
