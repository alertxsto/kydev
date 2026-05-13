import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbServer, TbRefresh, TbPlayerPlay, TbPlayerStop,
  TbRotateClockwise, TbPower, TbSearch,
} from "react-icons/tb";

interface ServiceEntry {
  name: string;
  enabled: boolean;
  active: boolean;
  description: string;
}

export default function Services() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoke("list_system_services") as ServiceEntry[];
      setServices(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doAction = async (name: string, action: string) => {
    setActionLoading(`${name}-${action}`);
    try {
      await invoke("manage_service", { name, action });
      showToast(`${action} ${name} — OK`, true);
      await load();
    } catch (e) {
      showToast(`Failed: ${String(e)}`, false);
    }
    setActionLoading(null);
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = services.filter(s => {
    const matchQ = s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase());
    const matchF = filter === "all" ? true : filter === "active" ? s.active : !s.active;
    return matchQ && matchF;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbServer size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Service Manager</h2>
              <p className="text-sm text-base-content/50 mt-0.5">Manage systemd services — start, stop, enable</p>
            </div>
          </div>
          <button className="btn btn-sm btn-outline gap-1" onClick={load} disabled={loading}>
            <TbRefresh className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <TbSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              className="input input-bordered input-sm w-full pl-8 font-mono text-xs"
              placeholder="Filter services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="tabs tabs-boxed bg-base-300/50 p-0.5">
            {(["all", "active", "inactive"] as const).map(f => (
              <button key={f} className={`tab tab-sm capitalize ${filter === f ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner text-primary loading-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-base-content/40">
            <TbServer size={40} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm">No services found</p>
          </div>
        ) : (
          filtered.map((s) => {
            const isActing = actionLoading?.startsWith(s.name);
            return (
              <div key={s.name} className={`rounded-xl border p-4 transition-all ${s.active ? "border-success/20 bg-success/5" : "border-base-content/10 bg-base-200/30"} hover:border-base-content/20`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.active ? "bg-success shadow-success/40 shadow-md" : "bg-base-content/20"}`} />
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-base-content/50 truncate mt-0.5">{s.description || "No description"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge badge-xs ${s.enabled ? "badge-success" : "badge-ghost"}`}>
                      {s.enabled ? "enabled" : "disabled"}
                    </span>
                    {s.active ? (
                      <button className="btn btn-xs btn-outline btn-error gap-1" disabled={!!isActing} onClick={() => doAction(s.name, "stop")}>
                        {actionLoading === `${s.name}-stop` ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerStop size={12} />} Stop
                      </button>
                    ) : (
                      <button className="btn btn-xs btn-outline btn-success gap-1" disabled={!!isActing} onClick={() => doAction(s.name, "start")}>
                        {actionLoading === `${s.name}-start` ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerPlay size={12} />} Start
                      </button>
                    )}
                    <button className="btn btn-xs btn-outline gap-1" disabled={!!isActing} onClick={() => doAction(s.name, "restart")}>
                      <TbRotateClockwise size={12} />
                    </button>
                    {s.enabled ? (
                      <button className="btn btn-xs btn-outline btn-warning gap-1" disabled={!!isActing} onClick={() => doAction(s.name, "disable")}>
                        <TbPower size={12} />
                      </button>
                    ) : (
                      <button className="btn btn-xs btn-outline gap-1" disabled={!!isActing} onClick={() => doAction(s.name, "enable")}>
                        <TbPower size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-end z-50`}>
          <div className={`alert ${toast.ok ? "alert-success" : "alert-error"} text-xs py-2 px-4 rounded-xl shadow-xl`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
