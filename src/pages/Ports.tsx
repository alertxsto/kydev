import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbNetwork, TbRefresh, TbTrash, TbPlugConnected } from "react-icons/tb";

interface PortEntry { port: number; process: string; pid: number; }

export default function Ports() {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [killing, setKilling] = useState<number | null>(null);

  const loadPorts = async () => {
    setLoading(true);
    try {
      const res = await invoke("list_ports");
      setPorts(res as PortEntry[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const killProcess = async (pid: number) => {
    setKilling(pid);
    await invoke("kill_process", { pid });
    setKilling(null);
    loadPorts();
  };

  useEffect(() => { loadPorts(); }, []);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbNetwork size={22} /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Network Ports</h2>
            <p className="text-sm text-base-content/50 mt-0.5">Active listening ports & processes</p>
          </div>
        </div>
        <button className="btn btn-sm btn-outline gap-1" onClick={loadPorts} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={14} className={loading ? "animate-spin" : ""} />}
          Refresh
        </button>
      </div>

      {loading && ports.length === 0 ? (
        <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
      ) : ports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40 border-2 border-dashed border-base-content/10 rounded-2xl">
          <TbPlugConnected size={40} className="opacity-30" />
          <p className="text-sm mt-3">No listening ports found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {ports.map((p) => (
            <div key={`${p.port}-${p.pid}`} className="rounded-xl border border-base-content/10 bg-base-200/30 p-4 flex items-center justify-between hover:border-base-content/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-lg font-mono font-bold text-info w-20">{p.port}</div>
                <div>
                  <p className="text-sm font-medium truncate max-w-md">{p.process}</p>
                  {p.pid > 0 && <p className="text-[10px] font-mono text-base-content/40 mt-0.5">PID {p.pid}</p>}
                </div>
              </div>
              {p.pid > 0 && (
                <button className="btn btn-sm btn-ghost text-error gap-1" onClick={() => killProcess(p.pid)} disabled={killing === p.pid}>
                  {killing === p.pid ? <span className="loading loading-spinner loading-xs" /> : <TbTrash size={14} />}
                  Kill
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
