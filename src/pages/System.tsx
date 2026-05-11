import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbRefresh, TbTrash, TbPackage } from "react-icons/tb";

interface UpdateInfo { count: number; has_updates: boolean; }

export default function SystemPage() {
  const [updates, setUpdates] = useState<UpdateInfo | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState("");

  const check = async () => {
    const u = await invoke("check_updates");
    setUpdates(u as UpdateInfo);
  };

  const runUpdate = async () => {
    setRunning("update"); setOutput("");
    const out = await invoke("run_update");
    setOutput(out as string); setRunning(null); check();
  };

  const runCleanup = async () => {
    setRunning("cleanup"); setOutput("");
    const out = await invoke("run_cleanup");
    setOutput(out as string); setRunning(null);
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbPackage size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Maintenance</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Package management & cleanup</p>
        </div>
      </div>

      {/* Update Card */}
      <div className="rounded-2xl border border-base-content/10 bg-base-200/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">System Updates</h3>
            <p className="text-xs text-base-content/50 mt-0.5">Check and apply pending DNF updates & security patches</p>
          </div>
          {updates && (
            <span className={`badge badge-lg gap-1 ${updates.has_updates ? "badge-warning" : "badge-success"}`}>
              {updates.count} available
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm gap-1" onClick={runUpdate} disabled={running !== null}>
            {running === "update" ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={14} />}
            {running === "update" ? "Updating..." : "Update All"}
          </button>
          <button className="btn btn-outline btn-sm gap-1" onClick={runCleanup} disabled={running !== null}>
            {running === "cleanup" ? <span className="loading loading-spinner loading-xs" /> : <TbTrash size={14} />}
            Cleanup
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <div className="rounded-2xl border border-base-content/10 bg-base-300/50 overflow-hidden">
          <div className="px-4 py-2 bg-base-200/50 border-b border-base-content/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Output</span>
          </div>
          <pre className="p-4 text-xs font-mono text-base-content/70 whitespace-pre-wrap max-h-60 overflow-y-auto">{output}</pre>
        </div>
      )}
    </div>
  );
}
