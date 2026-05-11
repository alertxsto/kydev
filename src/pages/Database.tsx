import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbDatabase, TbPlayerPlayFilled, TbAlertTriangle } from "react-icons/tb";

export default function DatabaseStudio() {
  const [dbType, setDbType] = useState("postgres");
  const [connStr, setConnStr] = useState("-U postgres");
  const [query, setQuery] = useState("SELECT 1;");
  const [useRoot, setUseRoot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);

  const getServiceName = () => {
    if (dbType === "postgres") return "postgresql";
    if (dbType === "mysql") return "mysqld";
    if (dbType === "redis") return "redis";
    return "";
  };

  const checkService = async () => {
    const s = getServiceName();
    if (!s) return;
    try { setServiceStatus(await invoke("check_service", { name: s }) as boolean); }
    catch { setServiceStatus(false); }
  };

  const startService = async () => {
    setLoading(true);
    try { await invoke("start_service", { name: getServiceName() }); await checkService(); }
    catch (e) { setResponse(String(e)); }
    setLoading(false);
  };

  useEffect(() => { checkService(); }, [dbType]);

  const executeQuery = async () => {
    if (!query) return;
    setLoading(true); setResponse("Executing...");
    try { setResponse(await invoke("run_db_query", { dbType, connStr, query, useRoot }) as string); }
    catch (e) { setResponse(String(e)); }
    setLoading(false);
  };

  const getPlaceholder = () => {
    if (dbType === "postgres") return "-U postgres -d postgres";
    if (dbType === "mysql") return "-u root -p password";
    if (dbType === "redis") return "-u redis://localhost:6379";
    return "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbDatabase size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Local DB Studio</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Execute raw queries against local databases</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Query pane */}
        <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-4 flex flex-col space-y-4">
          <div className="flex gap-2">
            <select className="select select-bordered w-36 font-bold text-sm" value={dbType} onChange={(e) => { setDbType(e.target.value); setConnStr(""); }}>
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL/MariaDB</option>
              <option value="redis">Redis</option>
            </select>
            <input type="text" className="input input-bordered flex-1 font-mono text-sm" placeholder={`e.g., ${getPlaceholder()}`} value={connStr} onChange={(e) => setConnStr(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <label className={`cursor-pointer label p-0 gap-2 ${dbType === "redis" ? "opacity-50" : ""}`}>
              <input type="checkbox" className="checkbox checkbox-sm checkbox-error" checked={useRoot} onChange={(e) => setUseRoot(e.target.checked)} disabled={dbType === "redis"} />
              <span className="label-text font-bold text-xs text-error">Run as Admin (pkexec)</span>
            </label>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs font-semibold mb-1">Query</label>
            <textarea
              className="textarea textarea-bordered w-full font-mono text-sm flex-1 min-h-[150px] rounded-xl"
              placeholder={dbType === "redis" ? "PING" : "SELECT * FROM users;"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") executeQuery(); }}
            />
            <p className="text-[10px] text-base-content/40 mt-1">Ctrl+Enter to execute</p>
          </div>

          <button className="btn btn-primary w-full gap-1" onClick={executeQuery} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : <TbPlayerPlayFilled size={16} />} Execute
          </button>

          {serviceStatus === false && (
            <div className="rounded-xl border border-error/30 bg-error/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TbAlertTriangle className="text-error" size={16} />
                <h3 className="font-bold text-error text-sm">Service Not Running</h3>
              </div>
              <p className="text-xs text-base-content/70">The <b>{getServiceName()}</b> service might not be running.</p>
              <button className="btn btn-sm btn-error w-full" onClick={startService} disabled={loading}>Start {getServiceName()}</button>
            </div>
          )}

          {response.includes("Access denied") && !useRoot && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TbAlertTriangle className="text-warning" size={16} />
                <h3 className="font-bold text-warning text-sm">Access Denied</h3>
              </div>
              <p className="text-xs text-base-content/70">Try enabling <b>Run as Admin</b> above.</p>
              <button className="btn btn-sm btn-warning w-full" onClick={() => { setUseRoot(true); executeQuery(); }}>Enable Admin & Retry</button>
            </div>
          )}
        </div>

        {/* Result pane */}
        <div className="w-1/2 bg-base-300 flex flex-col">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Query Result</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {response || <span className="text-base-content/30 italic">Write a query and hit Execute...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
