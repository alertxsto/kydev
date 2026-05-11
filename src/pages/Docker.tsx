import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbPlayerPlayFilled, TbPlayerStopFilled, TbRefresh, TbTrash, TbTerminal2, TbBrandDocker, TbWand } from "react-icons/tb";

interface ContainerInfo {
  id: string;
  image: string;
  status: string;
  ports: string;
  name: string;
}

export default function DockerManager() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tab, setTab] = useState("manager");
  const [services, setServices] = useState({ postgres: false, mysql: false, redis: false, nginx: false });
  const [composePath, setComposePath] = useState("~/projects");
  const [buildLoading, setBuildLoading] = useState(false);

  const generateCompose = async () => {
    setBuildLoading(true);
    let yml = "version: '3.8'\nservices:\n";
    if (services.postgres) yml += "  postgres:\n    image: postgres:latest\n    environment:\n      POSTGRES_PASSWORD: password\n    ports:\n      - '5432:5432'\n";
    if (services.mysql) yml += "  mysql:\n    image: mysql:latest\n    environment:\n      MYSQL_ROOT_PASSWORD: password\n    ports:\n      - '3306:3306'\n";
    if (services.redis) yml += "  redis:\n    image: redis:alpine\n    ports:\n      - '6379:6379'\n";
    if (services.nginx) yml += "  nginx:\n    image: nginx:alpine\n    ports:\n      - '80:80'\n";
    
    try {
      const realPath = composePath.replace("~", "/home/alertxsto");
      await invoke("write_compose_file", { path: realPath + "/docker-compose.yml", content: yml });
      await invoke("run_docker_compose", { path: realPath, action: "up -d" });
      setTab("manager");
      loadContainers();
    } catch(e) { console.error(e); }
    setBuildLoading(false);
  };

  const loadContainers = async () => {
    setLoading(true);
    try {
      const res = await invoke("get_containers");
      setContainers(res as ContainerInfo[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const runAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      await invoke("run_docker_action", { id, action });
      loadContainers();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const viewLogs = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await invoke("run_docker_action", { id, action: "logs --tail 50" });
      setLogs(res as string);
    } catch (e) {
      setLogs(String(e));
    }
  };

  useEffect(() => { loadContainers(); }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><TbBrandDocker /> Docker Hub</h2>
            <p className="text-xs text-base-content/50 mt-1">Manage containers & build compose files</p>
          </div>
          <div className="tabs tabs-boxed ml-4 bg-base-300/50">
            <a className={`tab tab-sm ${tab === 'manager' ? 'tab-active' : ''}`} onClick={() => setTab('manager')}>Manager</a>
            <a className={`tab tab-sm ${tab === 'builder' ? 'tab-active' : ''}`} onClick={() => setTab('builder')}>Auto-Composer</a>
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'manager' && (
            <>
              <button className="btn btn-sm btn-outline" onClick={loadContainers} disabled={loading}>
                <TbRefresh className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button className="btn btn-sm btn-error btn-outline" onClick={() => runAction("prune", "system prune -a -f")}>
                <TbTrash /> Prune All
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'manager' ? (
        <>
          <div className="w-1/2 border-r border-base-content/10 bg-base-100 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {containers.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-base-content/40 border border-dashed border-base-content/10 rounded-lg">
                No containers found. Docker might not be running.
              </div>
            )}
            {loading && containers.length === 0 && (
              <div className="p-8 text-center"><span className="loading loading-spinner text-primary" /></div>
            )}
            {containers.map(c => {
              const isUp = c.status.toLowerCase().includes("up");
              const isSelected = selectedId === c.id;
              return (
                <div key={c.id} className={`border rounded-lg p-3 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-base-content/20 bg-base-200/30'}`}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-success' : 'bg-error'}`} />
                        <h4 className="font-bold text-sm truncate">{c.name}</h4>
                        <span className="text-[10px] font-mono opacity-50">{c.id}</span>
                      </div>
                      <p className="text-xs text-base-content/60 truncate" title={c.image}>{c.image}</p>
                      <p className="text-[10px] text-base-content/40 truncate mt-1">{c.ports || "No exposed ports"}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-4">
                      {isUp ? (
                        <button className="btn btn-xs btn-outline btn-error" onClick={() => runAction(c.id, "stop")} disabled={actionLoading === c.id}>
                          {actionLoading === c.id ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerStopFilled />} Stop
                        </button>
                      ) : (
                        <button className="btn btn-xs btn-outline btn-success" onClick={() => runAction(c.id, "start")} disabled={actionLoading === c.id}>
                          {actionLoading === c.id ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerPlayFilled />} Start
                        </button>
                      )}
                      <button className="btn btn-xs btn-outline" onClick={() => viewLogs(c.id)}>
                        <TbTerminal2 /> Logs
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-1/2 bg-base-300 flex flex-col">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <TbTerminal2 className="opacity-50" />
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Container Logs {selectedId ? `(${selectedId})` : ""}
            </span>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {logs || "Select a container to view logs..."}
          </div>
        </div>
        </>
        ) : (
        <div className="flex-1 p-8 overflow-y-auto bg-base-100 flex flex-col items-center">
          <div className="max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Docker Compose Generator</h3>
            <p className="text-sm text-base-content/70 mb-6">Select the services you need. We will automatically generate a <code>docker-compose.yml</code> file and start the containers for you.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.keys(services).map(key => (
                <label key={key} className="cursor-pointer border border-base-content/10 rounded-box p-4 flex items-center gap-3 hover:bg-base-200/50 transition-colors">
                  <input type="checkbox" className="checkbox checkbox-primary" checked={(services as any)[key]} onChange={e => setServices({...services, [key]: e.target.checked})} />
                  <span className="font-bold capitalize">{key}</span>
                </label>
              ))}
            </div>

            <div className="form-control mb-6">
              <label className="label"><span className="label-text font-bold">Target Project Directory</span></label>
              <input type="text" className="input input-bordered font-mono text-sm" value={composePath} onChange={e => setComposePath(e.target.value)} />
            </div>

            <button className="btn btn-primary w-full" onClick={generateCompose} disabled={buildLoading || !Object.values(services).some(v=>v)}>
              {buildLoading ? <span className="loading loading-spinner" /> : <TbWand />} Generate & Up
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
