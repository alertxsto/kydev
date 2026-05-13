import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DirInput from "../components/DirInput";
import {
  TbPlayerPlayFilled, TbPlayerStopFilled, TbRefresh,
  TbTrash, TbTerminal2, TbBrandDocker, TbWand,
} from "react-icons/tb";

interface ContainerInfo {
  id: string; image: string; status: string; ports: string; name: string;
}

export default function DockerManager() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tab, setTab] = useState("manager");
  const [services, setServices] = useState({ postgres: false, mysql: false, redis: false, nginx: false });
  const [ports, setPorts] = useState({ postgres: "5432", mysql: "3306", redis: "6379", nginx: "80" });
  const [passwords, setPasswords] = useState({ postgres: "password", mysql: "password" });
  const [composePath, setComposePath] = useState("~/projects");
  const [buildLoading, setBuildLoading] = useState(false);

  const generateCompose = async () => {
    setBuildLoading(true);
    let yml = "version: '3.8'\nservices:\n";
    if (services.postgres) yml += `  postgres:\n    image: postgres:latest\n    environment:\n      POSTGRES_PASSWORD: ${passwords.postgres}\n    ports:\n      - '${ports.postgres}:5432'\n`;
    if (services.mysql) yml += `  mysql:\n    image: mysql:latest\n    environment:\n      MYSQL_ROOT_PASSWORD: ${passwords.mysql}\n    ports:\n      - '${ports.mysql}:3306'\n`;
    if (services.redis) yml += `  redis:\n    image: redis:alpine\n    ports:\n      - '${ports.redis}:6379'\n`;
    if (services.nginx) yml += `  nginx:\n    image: nginx:alpine\n    ports:\n      - '${ports.nginx}:80'\n`;
    try {
      const realPath = composePath.replace(/^~/, "/home/alertxsto");
      await invoke("write_compose_file", { path: realPath + "/docker-compose.yml", content: yml });
      await invoke("run_docker_compose", { path: realPath, action: "up -d" });
      setTab("manager");
      loadContainers();
    } catch (e) {
      alert(`Error generating/starting compose: ${String(e)}`);
      console.error(e);
    }
    setBuildLoading(false);
  };

  const loadContainers = async () => {
    setLoading(true);
    try {
      const res = await invoke("get_containers");
      setContainers(res as ContainerInfo[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const runAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      await invoke("run_docker_action", { id, action });
      loadContainers();
    } catch (e) {
      alert(`Failed to run action '${action}' on ${id}: ${String(e)}`);
      console.error(e);
    }
    setActionLoading(null);
  };

  const viewLogs = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await invoke("run_docker_action", { id, action: "logs --tail 50" });
      setLogs(res as string);
    } catch (e) { setLogs(String(e)); }
  };

  useEffect(() => { loadContainers(); }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbBrandDocker size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Docker Hub</h2>
              <p className="text-sm text-base-content/50 mt-0.5">Manage containers & build compose files</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="tabs tabs-boxed bg-base-300/50 p-0.5">
              <button className={`tab tab-sm ${tab === "manager" ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setTab("manager")}>Manager</button>
              <button className={`tab tab-sm ${tab === "builder" ? "tab-active bg-primary text-primary-content" : ""}`} onClick={() => setTab("builder")}>Auto-Composer</button>
            </div>
            {tab === "manager" && (
              <div className="flex gap-2">
                <button className="btn btn-sm btn-outline gap-1" onClick={loadContainers} disabled={loading}>
                  <TbRefresh className={loading ? "animate-spin" : ""} size={14} /> Refresh
                </button>
                <button className="btn btn-sm btn-outline btn-error gap-1" onClick={() => runAction("prune", "system prune -a -f")}>
                  <TbTrash size={14} /> Prune All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === "manager" ? (
          <>
            {/* Container list */}
            <div className="w-1/2 border-r border-base-content/10 bg-base-100 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading && containers.length === 0 ? (
                  <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
                ) : containers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
                    <TbBrandDocker size={40} className="opacity-30" />
                    <p className="text-sm mt-2">No containers found</p>
                    <p className="text-xs mt-1">Docker might not be running</p>
                  </div>
                ) : (
                  containers.map((c) => {
                    const isUp = c.status.toLowerCase().includes("up");
                    const isSelected = selectedId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-4 transition-all ${
                          isSelected ? "border-primary bg-primary/5" : "border-base-content/10 bg-base-200/30 hover:border-base-content/20"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${isUp ? "bg-success" : "bg-error"} shadow-sm ${isUp ? "shadow-success/30" : "shadow-error/30"}`} />
                              <h4 className="font-bold text-sm truncate">{c.name}</h4>
                              <span className="text-[10px] font-mono text-base-content/40">{c.id.slice(0, 12)}</span>
                            </div>
                            <p className="text-xs text-base-content/60 truncate">{c.image}</p>
                            <p className="text-[10px] text-base-content/40 mt-0.5">{c.ports || "No exposed ports"}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-3">
                            {isUp ? (
                              <button className="btn btn-xs btn-outline btn-error gap-1" onClick={() => runAction(c.id, "stop")} disabled={actionLoading === c.id}>
                                {actionLoading === c.id ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerStopFilled size={12} />} Stop
                              </button>
                            ) : (
                              <button className="btn btn-xs btn-outline btn-success gap-1" onClick={() => runAction(c.id, "start")} disabled={actionLoading === c.id}>
                                {actionLoading === c.id ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerPlayFilled size={12} />} Start
                              </button>
                            )}
                            <button className="btn btn-xs btn-outline gap-1" onClick={() => viewLogs(c.id)}>
                              <TbTerminal2 size={12} /> Logs
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Log pane */}
            <div className="w-1/2 bg-base-300 flex flex-col">
              <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
                <TbTerminal2 size={14} className="opacity-50" />
                <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
                  Container Logs {selectedId ? `(${selectedId.slice(0, 12)})` : ""}
                </span>
              </div>
              <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
                {logs || <span className="text-base-content/30 italic">Select a container to view logs...</span>}
              </div>
            </div>
          </>
        ) : (
          /* Auto-Composer */
          <div className="flex-1 overflow-y-auto bg-base-100 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-lg font-bold">Docker Compose Generator</h3>
                <p className="text-sm text-base-content/60 mt-1">Select services. We'll generate <code className="text-primary">docker-compose.yml</code> and start containers.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(services).map(([key, val]) => (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                      val ? "border-primary bg-primary/5" : "border-base-content/10 hover:border-base-content/20 bg-base-200/30"
                    }`}
                  >
                    <label className="cursor-pointer flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={val}
                        onChange={(e) => setServices({ ...services, [key as keyof typeof services]: e.target.checked })}
                      />
                      <span className="font-bold capitalize text-sm">{key}</span>
                    </label>
                    {val && (
                      <div className="flex gap-2 pl-8">
                        <div className="form-control w-full">
                          <label className="label py-1 px-0"><span className="label-text text-[10px] uppercase opacity-60 font-bold">Host Port</span></label>
                          <input type="text" className="input input-bordered input-sm font-mono text-xs w-full" value={ports[key as keyof typeof ports]} onChange={(e) => setPorts({ ...ports, [key]: e.target.value })} />
                        </div>
                        {(key === "postgres" || key === "mysql") && (
                          <div className="form-control w-full">
                            <label className="label py-1 px-0"><span className="label-text text-[10px] uppercase opacity-60 font-bold">Password</span></label>
                            <input type="text" className="input input-bordered input-sm font-mono text-xs w-full" value={passwords[key as keyof typeof passwords]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <DirInput
                label="Target Directory"
                value={composePath}
                onChange={setComposePath}
                placeholder="~/projects"
              />

              <button
                className="btn btn-primary w-full gap-2"
                onClick={generateCompose}
                disabled={buildLoading || !Object.values(services).some(Boolean)}
              >
                {buildLoading ? <span className="loading loading-spinner" /> : <TbWand size={16} />}
                Generate & Up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
