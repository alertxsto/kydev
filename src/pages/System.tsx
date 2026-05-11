interface UpdateInfo {
  count: number;
  has_updates: boolean;
}

export default function SystemPage() {
  const [updates, setUpdates] = useState<UpdateInfo | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState("");

  const check = async () => {
    const u = await invoke("check_updates");
    setUpdates(u as UpdateInfo);
  };

  const runUpdate = async () => {
    setRunning("update");
    setOutput("");
    const out = await invoke("run_update");
    setOutput(out as string);
    setRunning(null);
    check();
  };

  const runCleanup = async () => {
    setRunning("cleanup");
    setOutput("");
    const out = await invoke("run_cleanup");
    setOutput(out as string);
    setRunning(null);
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System</h2>
        <p className="text-sm text-neutral-content/50 mt-1">Package management & maintenance</p>
      </div>

      {/* Updates */}
      <div className="bg-base-200 rounded-box p-5 card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <span className="font-semibold">System Updates</span>
          </div>
          {updates && (
            <span className={`badge ${updates.has_updates ? "badge-warning" : "badge-success"} gap-1`}>
              {updates.count} available
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={runUpdate}
            disabled={running !== null}
          >
            {running === "update" ? <span className="loading loading-spinner loading-xs" /> : null}
            {running === "update" ? "Updating..." : "Update All"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={runCleanup}
            disabled={running !== null}
          >
            {running === "cleanup" ? <span className="loading loading-spinner loading-xs" /> : null}
            Cleanup
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <div className="bg-base-200 rounded-box p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold">Output</span>
          </div>
          <pre className="text-xs text-neutral-content/70 whitespace-pre-wrap font-mono bg-base-300 p-3 rounded-box max-h-60 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
