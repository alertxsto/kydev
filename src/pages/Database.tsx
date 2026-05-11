import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbDatabase, TbPlayerPlayFilled } from "react-icons/tb";

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
    try {
      const active = await invoke("check_service", { name: s });
      setServiceStatus(active as boolean);
    } catch {
      setServiceStatus(false);
    }
  };

  const startService = async () => {
    setLoading(true);
    const s = getServiceName();
    try {
      await invoke("start_service", { name: s });
      await checkService();
    } catch(e) {
      setResponse(String(e));
    }
    setLoading(false);
  };

  useEffect(() => { checkService(); }, [dbType]);

  const executeQuery = async () => {
    if (!query) return;
    setLoading(true);
    setResponse("Executing...");
    try {
      const res: string = await invoke("run_db_query", { dbType, connStr, query, useRoot });
      setResponse(res);
    } catch (e) {
      setResponse(String(e));
    }
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
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2"><TbDatabase /> Local DB Studio</h2>
        <p className="text-xs text-base-content/50 mt-1">Execute raw queries against local databases quickly via native CLI clients.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-4 flex flex-col">
          <div className="flex gap-2 mb-2">
            <select className="select select-bordered w-32 font-bold" value={dbType} onChange={e => { setDbType(e.target.value); setConnStr(""); }}>
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL/MariaDB</option>
              <option value="redis">Redis</option>
            </select>
            <input type="text" className="input input-bordered flex-1 font-mono text-sm" placeholder={`Connection args e.g., ${getPlaceholder()}`} value={connStr} onChange={e => setConnStr(e.target.value)} />
          </div>
          <div className="flex gap-2 mb-4">
              <label className={`cursor-pointer label p-0 gap-2 ${dbType === 'redis' ? 'opacity-50' : ''}`}>
                <input type="checkbox" className="checkbox checkbox-sm checkbox-error" checked={useRoot} onChange={e => setUseRoot(e.target.checked)} disabled={dbType === 'redis'} />
                <span className="label-text font-bold text-xs text-error">Force Run as Admin (pkexec/sudo)</span>
              </label>
          </div>

          <div className="mb-4 flex-1 flex flex-col">
            <label className="label"><span className="label-text font-bold">Query / Command</span></label>
            <textarea className="textarea textarea-bordered w-full font-mono text-sm flex-1 min-h-[200px]" placeholder={dbType === 'redis' ? 'PING' : 'SELECT * FROM users;'} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if(e.ctrlKey && e.key === 'Enter') executeQuery(); }}></textarea>
            <label className="label"><span className="label-text-alt opacity-50">Press Ctrl+Enter to execute</span></label>
          </div>

          <button className="btn btn-primary w-full" onClick={executeQuery} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : <TbPlayerPlayFilled />} Execute
          </button>

          {serviceStatus === false && (
            <div className="mt-4 p-4 bg-error/10 border border-error rounded-box">
              <h3 className="font-bold text-error text-sm mb-2">Connection Doctor 🩺</h3>
              <p className="text-xs mb-3 text-base-content/70">It looks like the <b>{getServiceName()}</b> service is not running. This might be why your connection fails.</p>
              <button className="btn btn-sm btn-error w-full" onClick={startService} disabled={loading}>
                Start {getServiceName()} Service
              </button>
            </div>
          )}

          {response.includes("Access denied") && !useRoot && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning rounded-box">
              <h3 className="font-bold text-warning text-sm mb-2">Authentication Error 🚨</h3>
              <p className="text-xs mb-3 text-base-content/70">It looks like your database rejected the connection. If you are trying to connect locally without a password, try checking the <b>Force Run as Admin</b> box above to bypass authentication via socket.</p>
              <button className="btn btn-sm btn-warning w-full" onClick={() => { setUseRoot(true); executeQuery(); }}>
                Enable Admin Mode & Retry
              </button>
            </div>
          )}
        </div>

        <div className="w-1/2 bg-base-300 flex flex-col">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Query Result</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {response || "Write a query and hit Execute..."}
          </div>
        </div>
      </div>
    </div>
  );
}
