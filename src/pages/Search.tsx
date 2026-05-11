import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbSearch, TbRefresh, TbDownload, TbTrash, TbHistory } from "react-icons/tb";

interface PackageInfo {
  name: string; summary: string; version: string; repo: string; arch: string; size: string; installed: boolean;
}

interface UpdatePreview {
  name: string; old_version: string; new_version: string; repo: string;
}

interface HistoryEntry {
  id: string; command: string; date: string; action: string;
}

export default function Packages() {
  const [tab, setTab] = useState<"search" | "updates" | "history">("search");

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageInfo | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionOutput, setActionOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Updates state
  const [updates, setUpdates] = useState<UpdatePreview[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updateOutput, setUpdateOutput] = useState("");

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSelectedPkg(null);
    try {
      const res = await invoke("search_packages", { query: query.trim() });
      setResults(res as PackageInfo[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getDetails = async (name: string) => {
    setLoadingDetails(true); setActionOutput("");
    try {
      const res = await invoke("get_package_details", { name });
      setSelectedPkg(res as PackageInfo);
    } catch (e) { console.error(e); }
    setLoadingDetails(false);
  };

  const pkgAction = async (action: "install" | "remove", name: string) => {
    setIsProcessing(true);
    setActionOutput(`Running dnf ${action} ${name}...\n`);
    const out = await invoke(`${action}_package`, { name });
    setActionOutput((prev) => prev + out);
    setIsProcessing(false);
    getDetails(name); // refresh details
  };

  const loadUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const res = await invoke("preview_updates");
      setUpdates(res as UpdatePreview[]);
    } catch (e) { console.error(e); }
    setLoadingUpdates(false);
  };

  const runUpdate = async () => {
    setIsProcessing(true); setUpdateOutput("Starting system upgrade...\n");
    const out = await invoke("run_update");
    setUpdateOutput((prev) => prev + out);
    setIsProcessing(false);
    loadUpdates(); // refresh
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoke("get_dnf_history");
      setHistory(res as HistoryEntry[]);
    } catch (e) { console.error(e); }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === "updates" && updates.length === 0 && !loadingUpdates) loadUpdates();
    if (tab === "history" && history.length === 0 && !loadingHistory) loadHistory();
  }, [tab]);

  return (
    <div className="h-full flex flex-col">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <h2 className="text-xl font-bold mb-3">Package Manager (DNF)</h2>
        <div className="tabs tabs-boxed bg-base-300/50 inline-flex p-1 h-8 min-h-0">
          <button className={`tab tab-sm h-full ${tab === "search" ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setTab("search")}>
            <TbSearch className="mr-1" /> Search
          </button>
          <button className={`tab tab-sm h-full ${tab === "updates" ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setTab("updates")}>
            <TbRefresh className="mr-1" /> Upgrades {updates.length > 0 && `(${updates.length})`}
          </button>
          <button className={`tab tab-sm h-full ${tab === "history" ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setTab("history")}>
            <TbHistory className="mr-1" /> History
          </button>
        </div>
      </div>

      {tab === "search" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Search List */}
          <div className="w-1/2 border-r border-base-content/10 flex flex-col bg-base-100">
            <div className="p-3 border-b border-base-content/10 flex gap-2 shrink-0">
              <input type="text" placeholder="Search DNF packages..." className="input input-sm input-bordered flex-1 text-sm font-mono" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              <button className="btn btn-sm btn-primary" onClick={search} disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-xs" /> : "Search"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 && !loading ? (
                <div className="p-8 text-center text-sm text-base-content/40">Enter a query to search DNF repositories</div>
              ) : (
                <table className="table table-sm table-zebra w-full text-xs">
                  <thead className="bg-base-200 sticky top-0 z-10"><tr><th>Package Name</th></tr></thead>
                  <tbody>
                    {results.map((p) => (
                      <tr key={p.name} className={`cursor-pointer hover:bg-base-200/50 ${selectedPkg?.name === p.name ? "bg-primary/10" : ""}`} onClick={() => getDetails(p.name)}>
                        <td className="font-mono">{p.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Details Pane */}
          <div className="w-1/2 bg-base-200/30 flex flex-col">
            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner text-primary" /></div>
            ) : selectedPkg ? (
              <>
                <div className="p-6 border-b border-base-content/10 shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold font-mono text-primary">{selectedPkg.name}</h3>
                      <p className="text-sm mt-1 opacity-80 leading-relaxed max-h-24 overflow-y-auto">{selectedPkg.summary || "Loading details..."}</p>
                    </div>
                    {selectedPkg.installed && <span className="badge badge-success text-xs font-bold uppercase tracking-wider shrink-0">Installed</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div className="bg-base-300 p-3 rounded border border-base-content/5">
                      <p className="text-[10px] uppercase opacity-50 mb-1">Version</p>
                      <p className="font-mono truncate">{selectedPkg.version || "-"}</p>
                    </div>
                    <div className="bg-base-300 p-3 rounded border border-base-content/5">
                      <p className="text-[10px] uppercase opacity-50 mb-1">Architecture</p>
                      <p className="font-mono">{selectedPkg.arch || "-"}</p>
                    </div>
                    <div className="bg-base-300 p-3 rounded border border-base-content/5">
                      <p className="text-[10px] uppercase opacity-50 mb-1">Size</p>
                      <p className="font-mono">{selectedPkg.size || "-"}</p>
                    </div>
                    <div className="bg-base-300 p-3 rounded border border-base-content/5">
                      <p className="text-[10px] uppercase opacity-50 mb-1">Repository</p>
                      <p className="font-mono truncate">{selectedPkg.repo || "-"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!selectedPkg.installed ? (
                      <button className="btn btn-sm btn-primary" disabled={isProcessing} onClick={() => pkgAction("install", selectedPkg.name)}>
                        <TbDownload /> Install Package
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline btn-error" disabled={isProcessing} onClick={() => pkgAction("remove", selectedPkg.name)}>
                          <TbTrash /> Remove
                        </button>
                        <button className="btn btn-sm btn-outline" disabled={isProcessing} onClick={() => pkgAction("install", selectedPkg.name)}>
                          Reinstall
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Terminal Output */}
                <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-tight text-base-content/70 overflow-y-auto whitespace-pre-wrap">
                  {actionOutput || "Ready."}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-base-content/30">Select a package to view details</div>
            )}
          </div>
        </div>
      )}

      {tab === "updates" && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-2/3 border-r border-base-content/10 bg-base-100 flex flex-col">
            <div className="p-3 border-b border-base-content/10 flex justify-between items-center bg-base-200/30">
              <span className="text-sm font-semibold">Pending Updates ({updates.length})</span>
              <button className="btn btn-sm btn-outline" onClick={loadUpdates} disabled={loadingUpdates}>
                {loadingUpdates ? <span className="loading loading-spinner loading-xs" /> : <><TbRefresh className="mr-1" /> Check Updates</>}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingUpdates ? (
                 <div className="p-8 text-center"><span className="loading loading-spinner text-primary" /></div>
              ) : updates.length === 0 ? (
                <div className="p-8 text-center text-sm text-success">System is up to date</div>
              ) : (
                <table className="table table-sm table-zebra w-full text-xs">
                  <thead className="bg-base-200 sticky top-0 z-10"><tr><th>Package</th><th>New Version</th><th>Repository</th></tr></thead>
                  <tbody>
                    {updates.map((u) => (
                      <tr key={u.name}><td className="font-mono font-semibold">{u.name}</td><td className="font-mono text-info">{u.new_version}</td><td className="text-base-content/50">{u.repo}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="w-1/3 bg-base-200/30 flex flex-col">
            <div className="p-6 border-b border-base-content/10">
              <h3 className="text-lg font-bold mb-2">Upgrade System</h3>
              <p className="text-xs text-base-content/60 mb-4">This will upgrade all pending packages and apply security patches.</p>
              <button className="btn btn-primary w-full" disabled={isProcessing || updates.length === 0} onClick={runUpdate}>
                {isProcessing ? <span className="loading loading-spinner loading-sm" /> : "Upgrade All"}
              </button>
            </div>
            <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-tight text-base-content/70 overflow-y-auto whitespace-pre-wrap">
              {updateOutput || "Ready."}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="flex-1 flex flex-col bg-base-100">
           <div className="p-3 border-b border-base-content/10 flex justify-between items-center bg-base-200/30">
              <span className="text-sm font-semibold">Recent DNF Transactions</span>
              <button className="btn btn-sm btn-outline" onClick={loadHistory} disabled={loadingHistory}>
                {loadingHistory ? <span className="loading loading-spinner loading-xs" /> : <><TbRefresh className="mr-1" /> Refresh History</>}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center"><span className="loading loading-spinner text-primary" /></div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-sm text-base-content/40">No history found.</div>
              ) : (
                <table className="table table-sm table-zebra w-full text-xs">
                  <thead className="bg-base-200 sticky top-0 z-10">
                    <tr><th>ID</th><th>Command Line</th><th>Date & Time</th><th>Action(s)</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="font-mono font-bold">{h.id}</td>
                        <td className="font-mono">{h.command}</td>
                        <td>{h.date}</td>
                        <td><span className={`badge badge-sm badge-outline ${h.action.toLowerCase().includes('install') ? 'badge-success' : h.action.toLowerCase().includes('removed') ? 'badge-error' : ''}`}>{h.action}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
