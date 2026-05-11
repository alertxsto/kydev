import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbDeviceDesktop, TbCpu, TbServer, TbClock,
  TbTerminal2, TbHeartbeat, TbCpu2, TbDeviceAnalytics,
  TbDeviceFloppy, TbPackage, TbAlertTriangle,
} from "react-icons/tb";

interface SystemInfo {
  os: string; kernel: string; hostname: string; cpu: string;
  memory_used: string; memory_total: string; memory_pct: number;
  disk_used: string; disk_total: string; disk_pct: number;
  uptime: string; packages: number; shell: string; de: string;
}

interface UpdateInfo { count: number; has_updates: boolean }

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

  const metricIcons: Record<string, React.ReactNode> = {
    OS: <TbDeviceDesktop size={20} />,
    Kernel: <TbCpu size={20} />,
    Hostname: <TbServer size={20} />,
    Uptime: <TbClock size={20} />,
    Shell: <TbTerminal2 size={20} />,
    DE: <TbHeartbeat size={20} />,
  };

  const metrics = [
    { label: "OS", value: info?.os ?? "-" },
    { label: "Kernel", value: info?.kernel ?? "-" },
    { label: "Hostname", value: info?.hostname ?? "-" },
    { label: "Uptime", value: info?.uptime ?? "-" },
    { label: "Shell", value: info?.shell ?? "-" },
    { label: "DE", value: info?.de ?? "-" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-neutral-content/50 mt-1">System overview at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="stat bg-base-200 rounded-box p-3">
            <div className="stat-figure text-primary opacity-70">{metricIcons[m.label]}</div>
            <div className="stat-title text-xs text-neutral-content/50">{m.label}</div>
            <div className="stat-value text-sm font-bold mt-1 truncate">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-box p-4">
          <div className="flex items-center gap-2 mb-3">
            <TbCpu2 className="text-lg text-primary" />
            <span className="font-semibold">CPU</span>
          </div>
          <p className="text-sm text-neutral-content/70">{info?.cpu ?? "-"}</p>
        </div>

        <div className="bg-base-200 rounded-box p-4">
          <div className="flex items-center gap-2 mb-3">
            <TbDeviceAnalytics className="text-lg text-primary" />
            <span className="font-semibold">Memory</span>
          </div>
          <p className="text-sm text-neutral-content/70 mb-2">
            {info?.memory_used} / {info?.memory_total}
          </p>
          <progress
            className={`progress w-full ${(info?.memory_pct ?? 0) > 80 ? "progress-error" : (info?.memory_pct ?? 0) > 60 ? "progress-warning" : "progress-success"}`}
            value={info?.memory_pct ?? 0}
            max="100"
          />
          <p className="text-xs text-right mt-1 text-neutral-content/50">{info?.memory_pct}%</p>
        </div>

        <div className="bg-base-200 rounded-box p-4">
          <div className="flex items-center gap-2 mb-3">
            <TbDeviceFloppy className="text-lg text-primary" />
            <span className="font-semibold">Disk</span>
          </div>
          <p className="text-sm text-neutral-content/70 mb-2">
            {info?.disk_used} / {info?.disk_total}
          </p>
          <progress
            className={`progress w-full ${(info?.disk_pct ?? 0) > 80 ? "progress-error" : (info?.disk_pct ?? 0) > 60 ? "progress-warning" : "progress-success"}`}
            value={info?.disk_pct ?? 0}
            max="100"
          />
          <p className="text-xs text-right mt-1 text-neutral-content/50">{info?.disk_pct}%</p>
        </div>

        <div
          className={`bg-base-200 rounded-box p-4 cursor-pointer ${updates?.has_updates ? "border border-warning/30" : ""}`}
          onClick={() => window.location.hash = "#system"}
        >
          <div className="flex items-center gap-2 mb-3">
            {updates?.has_updates ? (
              <TbAlertTriangle className="text-lg text-warning" />
            ) : (
              <TbPackage className="text-lg text-success" />
            )}
            <span className="font-semibold">Updates</span>
          </div>
          {updates?.has_updates ? (
            <>
              <p className="text-sm text-warning font-bold">{updates.count} packages</p>
              <p className="text-xs text-neutral-content/50 mt-1">Updates available — click to view</p>
            </>
          ) : (
            <>
              <p className="text-sm text-success font-bold">{info?.packages ?? 0} packages</p>
              <p className="text-xs text-success/70 mt-1">System is up to date</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
