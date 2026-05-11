import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbDeviceDesktop, TbCpu, TbServer,
  TbTerminal2, TbHeartbeat, TbDeviceAnalytics,
  TbDeviceFloppy, TbPackage, TbAlertTriangle,
  TbGitCommit, TbRefresh,
} from "react-icons/tb";

interface SystemInfo {
  os: string; kernel: string; hostname: string; cpu: string;
  memory_used: string; memory_total: string; memory_pct: number;
  disk_used: string; disk_total: string; disk_pct: number;
  uptime: string; packages: number; shell: string; de: string;
}

interface UpdateInfo { count: number; has_updates: boolean }

function formatUptime(raw: string): string {
  const days = Math.floor(Number(raw) / 86400);
  const hours = Math.floor((Number(raw) % 86400) / 3600);
  const mins = Math.floor((Number(raw) % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function miniCpu(cpu: string): string {
  const match = cpu.match(/model name\s*:\s*(.+)/i);
  if (match) return match[1].replace(/\s+/g, " ").trim();
  return cpu.length > 50 ? cpu.slice(0, 50) + "…" : cpu;
}

export default function Dashboard() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [updates, setUpdates] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sys = await invoke("get_system_info");
        setInfo(sys as SystemInfo);
      } catch (e) { console.error(e); }
      setLoading(false);
      try {
        const upd = await invoke("check_updates");
        setUpdates(upd as UpdateInfo);
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const pct = (v?: number) => v ?? 0;
  const memPct = pct(info?.memory_pct);
  const diskPct = pct(info?.disk_pct);

  const memBar = memPct > 80 ? "progress-error" : memPct > 60 ? "progress-warning" : "progress-success";
  const diskBar = diskPct > 80 ? "progress-error" : diskPct > 60 ? "progress-warning" : "progress-success";

  const sysChips = [
    { icon: TbDeviceDesktop, label: info?.os ?? "—" },
    { icon: TbTerminal2, label: info?.shell ?? "—" },
    { icon: TbHeartbeat, label: info?.de ?? "—" },
    { icon: TbGitCommit, label: info?.kernel ?? "—" },
  ];

  const resources = [
    {
      icon: TbCpu, title: "CPU", color: "from-sky-500/20 to-sky-600/5",
      textColor: "text-sky-400", body: miniCpu(info?.cpu ?? ""),
      extra: null,
    },
    {
      icon: TbDeviceAnalytics, title: "Memory", color: "from-violet-500/20 to-violet-600/5",
      textColor: "text-violet-400",
      body: `${info?.memory_used} / ${info?.memory_total}`,
      pct: memPct, bar: memBar,
    },
    {
      icon: TbDeviceFloppy, title: "Disk", color: "from-amber-500/20 to-amber-600/5",
      textColor: "text-amber-400",
      body: `${info?.disk_used} / ${info?.disk_total}`,
      pct: diskPct, bar: diskBar,
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-base-content/50 mt-0.5">
            {info?.hostname ?? "system"} &middot; up {formatUptime(info?.uptime ?? "0")}
          </p>
        </div>
        <div className="badge badge-soft badge-primary gap-1.5 py-3 px-3">
          <TbServer size={14} />
          {info?.packages ?? 0} packages
        </div>
      </div>

      {/* ── System Chips ── */}
      <div className="flex flex-wrap gap-2">
        {sysChips.map((c) => (
          <div key={c.label} className="badge badge-soft badge-ghost gap-1.5 py-3 px-3 text-xs font-normal">
            <c.icon size={14} className="text-base-content/60" />
            {c.label}
          </div>
        ))}
      </div>

      {/* ── Resource Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resources.map((r) => (
          <div
            key={r.title}
            className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${r.color} pointer-events-none`} />
            <div className="relative p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={r.textColor}>{r.icon({ size: 20 })}</span>
                <span className="font-semibold text-sm">{r.title}</span>
              </div>
              <p className="text-xs text-base-content/70 leading-relaxed">{r.body}</p>
              {r.pct != null && (
                <div className="space-y-1 pt-1">
                  <progress
                    className={`progress w-full h-2 ${r.bar}`}
                    value={r.pct}
                    max="100"
                  />
                  <p className="text-xs text-right text-base-content/40">{r.pct}%</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Updates ── */}
      {updates && (
        <div
          className={`relative rounded-2xl border overflow-hidden cursor-pointer transition hover:brightness-105 ${
            updates.has_updates
              ? "border-warning/30 bg-warning/5"
              : "border-success/20 bg-success/5"
          }`}
          onClick={() => window.location.hash = "#system"}
        >
          <div className="p-4 flex items-center gap-4">
            <div className={`p-2 rounded-xl ${updates.has_updates ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
              {updates.has_updates ? <TbAlertTriangle size={24} /> : <TbPackage size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {updates.has_updates
                  ? `${updates.count} update${updates.count > 1 ? "s" : ""} available`
                  : "System is up to date"}
              </p>
              <p className="text-xs text-base-content/50 mt-0.5">
                {updates.has_updates ? "Click to view and install" : `Based on ${info?.packages ?? 0} installed packages`}
              </p>
            </div>
            <TbRefresh size={18} className="text-base-content/30 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}
