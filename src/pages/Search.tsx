import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbSearch, TbRefresh, TbDownload, TbTrash, TbHistory, TbPackage, TbAlertTriangle } from "react-icons/tb";

interface PackageInfo { name: string; summary: string; version: string; repo: string; arch: string; size: string; installed: boolean; }
interface UpdatePreview { name: string; old_version: string; new_version: string; repo: string; }
interface HistoryEntry { id: string; command: string; date: string; action: string; }

export default function Packages() {
  const [tab, setTab] = useState<"search" | "updates" | "history">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageInfo | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionOutput, setActionOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [updates, setUpdates] = useState<UpdatePreview[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updateOutput, setUpdateOutput] = useState("");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSelectedPkg(null);
    try { setResults(await invoke("search_packages", { query: query.trim() }) as PackageInfo[]); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getDetails = async (name: string) => {
    setLoadingDetails(true); setActionOutput("");
    try { setSelectedPkg(await invoke("get_package_details", { name }) as PackageInfo); } catch (e) { console.error(e); }
    setLoadingDetails(false);
  };

  const pkgAction = async (action: "install" | "remove", name: string) => {
    setIsProcessing(true);
    setActionOutput(`Running dnf ${action} ${name}...\n`);
    const out = await invoke(`${action}_package`, { name }) as string;
    setActionOutput((prev) => prev + out);
    setIsProcessing(false);
    getDetails(name);
  };

  const loadUpdates = async () => {
    setLoadingUpdates(true);
    try { setUpdates(await invoke("preview_updates") as UpdatePreview[]); } catch (e) { console.error(e); }
    setLoadingUpdates(false);
  };

  const runUpdate = async () => {
    setIsProcessing(true); setUpdateOutput("Starting system upgrade...\n");
    const out = await invoke("run_update") as string;
    setUpdateOutput((prev) => prev + out);
    setIsProcessing(false);
    loadUpdates();
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try { setHistory(await invoke("get_dnf_history") as HistoryEntry[]); } catch (e) { console.error(e); }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === "updates" && updates.length === 0 && !loadingUpdates) loadUpdates();
    if (tab === "history" && history.length === 0 && !loadingHistory) loadHistory();
  }, [tab]);

  const tabs = [
    { id: "search", label: "Search", icon: TbSearch },
    { id: "updates", label: `Upgrades${updates.length > 0 ? ` (${updates.length})` : ""}`, icon: TbRefresh },
    { id: "history", label: "History", icon: TbHistory },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbPackage size={22} /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Package Manager</h2>
            <p className="text-sm text-base-content/50 mt-0.5">DNF package search, updates & history</p>
          </div>
        </div>
        <div className="flex gap-1 bg-base-300/50 p-0.5 rounded-lg w-fit border border-base-content/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === t.id ? "bg-primary text-primary-content shadow-sm" : "hover:text-base-content"
              }`}
              onClick={() => setTab(t.id as typeof tab)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "search" && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-base-content/10 flex flex-col bg-base-100">
            <div className="p-3 border-b border-base-content/10 flex gap-2 shrink-0">
              <input type="text" placeholder="Search DNF packages..." className="input input-sm input-bordered flex-1 text-sm font-mono" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              <button className="btn btn-sm btn-primary gap-1" onClick={search} disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-xs" /> : <TbSearch size={14} />} Search
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {results.length === 0 && !loading ? (
                <div className="text-center text-sm text-base-content/40 py-12">Enter a query to search DNF repositories</div>
              ) : (
                results.map((p) => (
                  <div
                    key={p.name}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      selectedPkg?.name === p.name ? "border-primary bg-primary/5" : "border-base-content/10 bg-base-200/30 hover:bg-base-200"
                    }`}
                    onClick={() => getDetails(p.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold">{p.name}</span>
                      {p.installed && <span className="badge badge-xs badge-success">installed</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="w-1/2 bg-base-200/30 flex flex-col">
            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner text-primary" /></div>
            ) : selectedPkg ? (
              <>
                <div className="p-5 border-b border-base-content/10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold font-mono text-primary">{selectedPkg.name}</h3>
                      <p className="text-xs text-base-content/60 mt-1 leading-relaxed max-h-16 overflow-y-auto">{selectedPkg.summary || "No description"}</p>
                    </div>
                    {selectedPkg.installed && <span className="badge badge-success text-xs font-bold uppercase">Installed</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: "Version", val: selectedPkg.version }, { label: "Arch", val: selectedPkg.arch }, { label: "Size", val: selectedPkg.size }, { label: "Repo", val: selectedPkg.repo }].map((d) => (
                      <div key={d.label} className="bg-base-300/70 rounded-xl p-3 border border-base-content/5">
                        <p className="text-[10px] uppercase opacity-50 mb-0.5">{d.label}</p>
                        <p className="font-mono text-xs truncate">{d.val || "-"}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {!selectedPkg.installed ? (
                      <button className="btn btn-sm btn-primary gap-1" disabled={isProcessing} onClick={() => pkgAction("install", selectedPkg.name)}>
                        {isProcessing ? <span className="loading loading-spinner loading-xs" /> : <TbDownload size={14} />} Install
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline btn-error gap-1" disabled={isProcessing} onClick={() => pkgAction("remove", selectedPkg.name)}>
                          <TbTrash size={14} /> Remove
                        </button>
                        <button className="btn btn-sm btn-outline gap-1" disabled={isProcessing} onClick={() => pkgAction("install", selectedPkg.name)}>Reinstall</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
                  {actionOutput || <span className="text-base-content/30 italic">Ready.</span>}
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
            <div className="p-3 border-b border-base-content/10 flex justify-between items-center bg-base-200/30 shrink-0">
              <span className="text-sm font-semibold">Pending Updates ({updates.length})</span>
              <button className="btn btn-sm btn-outline gap-1" onClick={loadUpdates} disabled={loadingUpdates}>
                {loadingUpdates ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={14} />} Check
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingUpdates ? (
                <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
              ) : updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
                  <TbPackage size={36} className="opacity-30" />
                  <p className="text-sm text-success mt-2">System is up to date</p>
                </div>
              ) : (
                updates.map((u) => (
                  <div key={u.name} className="rounded-xl border border-base-content/10 bg-base-200/30 p-3 flex items-center justify-between hover:border-base-content/20 transition-colors">
                    <span className="font-mono text-xs font-semibold">{u.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-base-content/40 line-through">{u.old_version}</span>
                      <span className="text-xs font-mono text-info">{u.new_version}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="w-1/3 bg-base-200/30 flex flex-col">
            <div className="p-5 border-b border-base-content/10 space-y-3">
              <h3 className="font-semibold">Upgrade System</h3>
              <p className="text-xs text-base-content/60">Upgrade all pending packages and apply security patches.</p>
              <button className="btn btn-primary w-full gap-1" disabled={isProcessing || updates.length === 0} onClick={runUpdate}>
                {isProcessing ? <span className="loading loading-spinner loading-sm" /> : <TbAlertTriangle size={14} />} Upgrade All
              </button>
            </div>
            <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
              {updateOutput || <span className="text-base-content/30 italic">Ready.</span>}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="flex-1 flex flex-col bg-base-100">
          <div className="p-3 border-b border-base-content/10 flex justify-between items-center bg-base-200/30 shrink-0">
            <span className="text-sm font-semibold">Recent DNF Transactions</span>
            <button className="btn btn-sm btn-outline gap-1" onClick={loadHistory} disabled={loadingHistory}>
              {loadingHistory ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={14} />} Refresh
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loadingHistory ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
            ) : history.length === 0 ? (
              <div className="text-center text-sm text-base-content/40 py-12">No history found.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-xl border border-base-content/10 bg-base-200/30 p-3 flex items-center justify-between hover:border-base-content/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs font-bold">{h.id}</span>
                    <span className="text-xs font-mono truncate">{h.command}</span>
                    <span className="text-[10px] text-base-content/40 shrink-0">{h.date}</span>
                  </div>
                  <span className={`badge badge-sm badge-outline shrink-0 ${
                    h.action.toLowerCase().includes("install") ? "badge-success" :
                    h.action.toLowerCase().includes("remov") ? "badge-error" : ""
                  }`}>{h.action}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
