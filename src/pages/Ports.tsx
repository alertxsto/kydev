interface PortEntry {
  port: number;
  process: string;
  pid: number;
}

export default function Ports() {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [killing, setKilling] = useState<number | null>(null);

  const loadPorts = async () => {
    setLoading(true);
    try {
      const res = await invoke("list_ports");
      setPorts(res as PortEntry[]);
    } catch (e) {
      console.error(e);
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ports</h2>
          <p className="text-sm text-neutral-content/50 mt-1">Active network ports & processes</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadPorts}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : null}
          Refresh
        </button>
      </div>

      {loading && ports.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : ports.length === 0 ? (
        <div className="bg-base-200 rounded-box p-8 text-center">
          <p className="text-neutral-content/50">No listening ports found</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-base-200 rounded-box">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Port</th>
                <th>Process</th>
                <th>PID</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {ports.map((p) => (
                <tr key={`${p.port}-${p.pid}`}>
                  <td className="font-mono font-bold text-info">{p.port}</td>
                  <td className="text-sm truncate max-w-60">{p.process}</td>
                  <td className="font-mono text-xs text-neutral-content/50">{p.pid || "-"}</td>
                  <td>
                    {p.pid > 0 && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => killProcess(p.pid)}
                        disabled={killing === p.pid}
                      >
                        {killing === p.pid ? <span className="loading loading-spinner loading-xs" /> : "Kill"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
