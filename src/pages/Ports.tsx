import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbNetwork, TbRefresh, TbSearch, TbSkull,
  TbPlugConnected, TbBrandChrome, TbServer,
} from "react-icons/tb";

interface ProcessEntry { pid: number; name: string; port: number; proto: string; state: string; }

const PROTO_COLOR: Record<string, string> = {
  tcp: "badge-info", tcp6: "badge-info", udp: "badge-warning", udp6: "badge-warning",
};

const STATE_COLOR: Record<string, string> = {
  LISTEN: "text-success", ESTAB: "text-info", "TIME-WAIT": "text-warning",
  CLOSE: "text-error", unconn: "text-base-content/40",
};

const KNOWN_PORTS: Record<number, string> = {
  80: "HTTP", 443: "HTTPS", 3000: "Dev Server", 3306: "MySQL", 5432: "Postgres",
  6379: "Redis", 8080: "Alt HTTP", 8443: "Alt HTTPS", 22: "SSH", 21: "FTP",
  5173: "Vite", 4200: "Angular", 3001: "Node", 27017: "MongoDB",
};

export default function Ports() {
  const [procs, setProcs] = useState<ProcessEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [killing, setKilling] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [confirmKill, setConfirmKill] = useState<ProcessEntry | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    try { setProcs(await invoke("list_processes") as ProcessEntry[]); }
    catch {
      // fallback to old list_ports
      try {
        const old = await invoke("list_ports") as { port: number; process: string; pid: number }[];
        setProcs(old.map(p => ({ pid: p.pid, name: p.process, port: p.port, proto: "tcp", state: "LISTEN" })));
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const killProc = async (p: ProcessEntry) => {
    setKilling(p.pid);
    try {
      await invoke("kill_process", { pid: p.pid });
      showT(`Killed ${p.name} (PID ${p.pid})`, true);
      await load();
    } catch (e) { showT(String(e), false); }
    setKilling(null);
    setConfirmKill(null);
  };

  const showT = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = procs.filter(p =>
    String(p.port).includes(query) ||
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.proto.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbNetwork size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Process Monitor</h2>
              <p className="text-sm text-base-content/50 mt-0.5">{procs.length} active ports · click kill to terminate</p>
            </div>
          </div>
          <button className="btn btn-sm btn-outline gap-1" onClick={load} disabled={loading}>
            <TbRefresh className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>
        <div className="relative">
          <TbSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input type="text" className="input input-bordered input-sm w-full pl-8" placeholder="Filter by port, process, or protocol..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && procs.length === 0 ? (
          <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary loading-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-base-content/40">
            <TbPlugConnected size={40} className="opacity-20" />
            <p className="text-sm mt-3">{query ? "No matching processes" : "No listening ports found"}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map(p => (
              <div
                key={`${p.port}-${p.pid}`}
                className="rounded-xl border border-base-content/10 bg-base-200/30 hover:border-base-content/20 transition-all p-3.5 flex items-center gap-4"
              >
                {/* Port badge */}
                <div className="text-center shrink-0 w-20">
                  <div className="text-2xl font-mono font-black text-primary leading-none">{p.port}</div>
                  {KNOWN_PORTS[p.port] && (
                    <div className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mt-0.5">{KNOWN_PORTS[p.port]}</div>
                  )}
                </div>

                {/* Process info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{p.name || "unknown"}</p>
                    <span className={`badge badge-xs ${PROTO_COLOR[p.proto] ?? "badge-ghost"}`}>{p.proto}</span>
                    {p.state && (
                      <span className={`text-[10px] font-bold ${STATE_COLOR[p.state] ?? "text-base-content/50"}`}>{p.state}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-base-content/40 mt-0.5">PID {p.pid > 0 ? p.pid : "—"}</p>
                </div>

                {/* Icon hint */}
                <div className="text-base-content/20 shrink-0">
                  {p.name.includes("chrome") || p.name.includes("firefox") ? <TbBrandChrome size={18} /> :
                   p.name.includes("nginx") || p.name.includes("apache") ? <TbServer size={18} /> : null}
                </div>

                {/* Kill button */}
                {p.pid > 0 && (
                  <button
                    className="btn btn-sm btn-ghost text-error gap-1 shrink-0"
                    onClick={() => setConfirmKill(p)}
                    disabled={killing === p.pid}
                  >
                    {killing === p.pid ? <span className="loading loading-spinner loading-xs" /> : <TbSkull size={14} />}
                    Kill
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kill confirmation modal */}
      {confirmKill && (
        <div className="fixed inset-0 z-50 bg-base-300/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setConfirmKill(null)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-error/10 text-error"><TbSkull size={22} /></div>
              <div>
                <h3 className="font-bold">Kill Process?</h3>
                <p className="text-sm text-base-content/60">This will terminate the process immediately.</p>
              </div>
            </div>
            <div className="bg-base-300 rounded-xl p-3 font-mono text-sm">
              <span className="text-primary">:{confirmKill.port}</span> · <span className="font-semibold">{confirmKill.name}</span> · PID {confirmKill.pid}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-error flex-1 gap-1" onClick={() => killProc(confirmKill)}>
                <TbSkull size={14} /> Kill
              </button>
              <button className="btn btn-ghost flex-1" onClick={() => setConfirmKill(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast toast-end z-50">
          <div className={`alert ${toast.ok ? "alert-success" : "alert-error"} text-xs py-2 px-4 rounded-xl`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
