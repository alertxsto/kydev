import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbDeviceDesktop, TbCpu, TbServer,
  TbTerminal2, TbHeartbeat, TbDeviceAnalytics,
  TbDeviceFloppy, TbPackage, TbAlertTriangle,
  TbGitCommit, TbRefresh, TbActivity,
} from "react-icons/tb";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface SystemInfo {
  os: string; kernel: string; hostname: string; cpu: string;
  memory_used: string; memory_total: string; memory_pct: number;
  disk_used: string; disk_total: string; disk_pct: number;
  uptime: string; packages: number; shell: string; de: string;
}

interface UpdateInfo { count: number; has_updates: boolean }
interface ChartPoint { t: string; cpu: number; mem: number; }

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
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(loadInfo, 5000);
  };
  const stopPolling = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const loadInfo = async () => {
    try {
      const sys = await invoke("get_system_info") as SystemInfo;
      setInfo(sys);
      const now = new Date();
      const label = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
      setChartData(prev => {
        const next = [...prev, { t: label, cpu: 0, mem: Math.round(sys.memory_pct) }];
        return next.slice(-30);
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadInfo();
      setLoading(false);
      try {
        const upd = await invoke("check_updates");
        setUpdates(upd as UpdateInfo);
      } catch (e) { console.error(e); }
    }
    init();
    startPolling();

    // Pause polling when tab/window loses focus
    const onVisible = () => document.hidden ? stopPolling() : startPolling();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
    };
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

  return (
    <div className="p-8 space-y-7 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-base text-base-content/60 mt-1.5 font-medium">
            {info?.hostname ?? "system"} &middot; up {formatUptime(info?.uptime ?? "0")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge badge-soft badge-primary gap-2 py-3.5 px-4 text-sm font-semibold">
            <TbServer size={16} />
            {info?.packages ?? 0} packages
          </div>
        </div>
      </div>

      {/* System Chips */}
      <div className="flex flex-wrap gap-3">
        {sysChips.map((c) => (
          <div key={c.label} className="badge badge-soft badge-ghost gap-2 py-3.5 px-4 text-sm font-medium">
            <c.icon size={16} className="text-base-content/70" />
            {c.label}
          </div>
        ))}
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-sky-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sky-400"><TbCpu size={22} /></span>
              <span className="font-bold text-base">CPU</span>
            </div>
            <p className="text-sm text-base-content/75 leading-relaxed font-medium">{miniCpu(info?.cpu ?? "")}</p>
          </div>
        </div>
        <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-violet-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-violet-400"><TbDeviceAnalytics size={22} /></span>
              <span className="font-bold text-base">Memory</span>
            </div>
            <p className="text-sm text-base-content/75 font-medium">{info?.memory_used} / {info?.memory_total}</p>
            <div className="space-y-2 pt-2">
              <progress className={`progress w-full h-2.5 ${memBar}`} value={memPct} max="100" />
              <p className="text-sm text-right text-base-content/60 font-medium">{memPct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-amber-400"><TbDeviceFloppy size={22} /></span>
              <span className="font-bold text-base">Disk</span>
            </div>
            <p className="text-sm text-base-content/75 font-medium">{info?.disk_used} / {info?.disk_total}</p>
            <div className="space-y-2 pt-2">
              <progress className={`progress w-full h-2.5 ${diskBar}`} value={diskPct} max="100" />
              <p className="text-sm text-right text-base-content/60 font-medium">{diskPct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Memory Chart */}
      {chartData.length > 2 && (
        <div className="rounded-2xl border border-base-300/40 bg-base-200/70 p-6">
          <div className="flex items-center gap-3 mb-5">
            <TbActivity size={20} className="text-violet-400" />
            <span className="font-bold text-base">Memory Usage — Live</span>
            <span className="badge badge-xs badge-ghost ml-auto animate-pulse">● LIVE</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: "rgba(20,20,30,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px" }}
                labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Memory"]}
              />
              <Area type="monotone" dataKey="mem" stroke="#8b5cf6" strokeWidth={2} fill="url(#memGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Updates */}
      {updates && (
        <div className={`relative rounded-2xl border overflow-hidden transition hover:brightness-105 ${updates.has_updates ? "border-warning/30 bg-warning/5" : "border-success/20 bg-success/5"}`}>
          <div className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${updates.has_updates ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
              {updates.has_updates ? <TbAlertTriangle size={24} /> : <TbPackage size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">
                {updates.has_updates ? `${updates.count} update${updates.count > 1 ? "s" : ""} available` : "System is up to date"}
              </p>
              <p className="text-sm text-base-content/60 mt-1 font-medium">
                {updates.has_updates ? "Go to Packages to install" : `Based on ${info?.packages ?? 0} installed packages`}
              </p>
            </div>
            <TbRefresh size={18} className="text-base-content/30 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}
