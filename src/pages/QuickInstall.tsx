import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbSearch, TbCheckbox, TbRefresh, TbDownload, TbBox, TbBolt } from "react-icons/tb";
import {
  SiNodedotjs, SiBun, SiDeno, SiRust, SiGo, SiPython, SiRuby, SiPhp, SiElixir, SiErlang, SiKotlin, SiScala, SiSwift, SiHaskell, SiOcaml,
  SiPostgresql, SiMysql, SiMariadb, SiSqlite, SiCockroachlabs, SiRedis, SiMongodb, SiApachecassandra, SiCouchbase, SiInfluxdb, SiElasticsearch,
  SiDocker, SiPodman, SiKubernetes, SiHelm, SiTerraform, SiAnsible,
  SiGooglecloud, SiVercel, SiNetlify,
  SiNginx, SiApache, SiCaddy,
  SiRabbitmq, SiApachekafka,
  SiGit, SiGithub, SiTmux,
} from "react-icons/si";

interface Environment { id: string; name: string; category: string; desc: string; Icon: any; }

const environments: Environment[] = [
  { id: "node", name: "Node.js", category: "Languages", desc: "via NVM", Icon: SiNodedotjs },
  { id: "bun", name: "Bun", category: "Languages", desc: "Fast JS runtime", Icon: SiBun },
  { id: "deno", name: "Deno", category: "Languages", desc: "Secure JS/TS runtime", Icon: SiDeno },
  { id: "rust", name: "Rust", category: "Languages", desc: "via rustup", Icon: SiRust },
  { id: "go", name: "Go", category: "Languages", desc: "Golang compiler", Icon: SiGo },
  { id: "python", name: "Python", category: "Languages", desc: "Python 3 & pip", Icon: SiPython },
  { id: "java", name: "Java (OpenJDK)", category: "Languages", desc: "OpenJDK 17", Icon: TbBox },
  { id: "c++", name: "C/C++", category: "Languages", desc: "GCC & Build Tools", Icon: TbBox },
  { id: "ruby", name: "Ruby", category: "Languages", desc: "Ruby lang", Icon: SiRuby },
  { id: "php", name: "PHP", category: "Languages", desc: "PHP CLI", Icon: SiPhp },
  { id: "elixir", name: "Elixir", category: "Languages", desc: "Elixir lang", Icon: SiElixir },
  { id: "erlang", name: "Erlang", category: "Languages", desc: "Erlang OTP", Icon: SiErlang },
  { id: "kotlin", name: "Kotlin", category: "Languages", desc: "Kotlin compiler", Icon: SiKotlin },
  { id: "scala", name: "Scala", category: "Languages", desc: "Scala lang", Icon: SiScala },
  { id: "swift", name: "Swift", category: "Languages", desc: "Swift compiler", Icon: SiSwift },
  { id: "haskell", name: "Haskell", category: "Languages", desc: "GHC", Icon: SiHaskell },
  { id: "ocaml", name: "OCaml", category: "Languages", desc: "OCaml compiler", Icon: SiOcaml },
  { id: "zig", name: "Zig", category: "Languages", desc: "Zig compiler", Icon: TbBox },
  { id: "nim", name: "Nim", category: "Languages", desc: "Nim compiler", Icon: TbBox },
  { id: "julia", name: "Julia", category: "Languages", desc: "Julia lang", Icon: TbBox },
  { id: "postgres", name: "PostgreSQL", category: "Databases", desc: "RDBMS", Icon: SiPostgresql },
  { id: "mysql", name: "MySQL", category: "Databases", desc: "RDBMS", Icon: SiMysql },
  { id: "mariadb", name: "MariaDB", category: "Databases", desc: "RDBMS", Icon: SiMariadb },
  { id: "sqlite", name: "SQLite", category: "Databases", desc: "Embedded DB", Icon: SiSqlite },
  { id: "cockroach", name: "CockroachDB", category: "Databases", desc: "Distributed SQL", Icon: SiCockroachlabs },
  { id: "redis", name: "Redis", category: "Databases", desc: "In-memory cache", Icon: SiRedis },
  { id: "mongodb", name: "MongoDB", category: "Databases", desc: "NoSQL document DB", Icon: SiMongodb },
  { id: "cassandra", name: "Cassandra", category: "Databases", desc: "Wide-column store", Icon: SiApachecassandra },
  { id: "couchdb", name: "CouchDB", category: "Databases", desc: "Document DB", Icon: SiCouchbase },
  { id: "influxdb", name: "InfluxDB", category: "Databases", desc: "Time-series DB", Icon: SiInfluxdb },
  { id: "elasticsearch", name: "Elasticsearch", category: "Databases", desc: "Search engine", Icon: SiElasticsearch },
  { id: "docker", name: "Docker", category: "DevOps", desc: "Container Engine", Icon: SiDocker },
  { id: "podman", name: "Podman", category: "DevOps", desc: "Daemonless containers", Icon: SiPodman },
  { id: "kubernetes", name: "Kubernetes", category: "DevOps", desc: "K8s CLI", Icon: SiKubernetes },
  { id: "helm", name: "Helm", category: "DevOps", desc: "K8s package manager", Icon: SiHelm },
  { id: "terraform", name: "Terraform", category: "DevOps", desc: "IaC tool", Icon: SiTerraform },
  { id: "ansible", name: "Ansible", category: "DevOps", desc: "Config mgmt", Icon: SiAnsible },
  { id: "aws", name: "AWS CLI", category: "Cloud", desc: "Amazon Web Services", Icon: TbBox },
  { id: "gcloud", name: "Google Cloud SDK", category: "Cloud", desc: "GCP CLI", Icon: SiGooglecloud },
  { id: "vercel", name: "Vercel CLI", category: "Cloud", desc: "Vercel deployment", Icon: SiVercel },
  { id: "netlify", name: "Netlify CLI", category: "Cloud", desc: "Netlify deployment", Icon: SiNetlify },
  { id: "nginx", name: "Nginx", category: "Web Servers", desc: "Web server & proxy", Icon: SiNginx },
  { id: "apache", name: "Apache HTTPD", category: "Web Servers", desc: "Web server", Icon: SiApache },
  { id: "caddy", name: "Caddy", category: "Web Servers", desc: "Auto-HTTPS server", Icon: SiCaddy },
  { id: "rabbitmq", name: "RabbitMQ", category: "Brokers", desc: "Message broker", Icon: SiRabbitmq },
  { id: "kafka", name: "Kafka", category: "Brokers", desc: "Event streaming", Icon: SiApachekafka },
  { id: "vscode", name: "VS Code", category: "Editors", desc: "Microsoft Editor", Icon: TbBox },
  { id: "terminal", name: "Terminal (Kitty)", category: "Editors", desc: "GPU Terminal", Icon: TbBox },
  { id: "git", name: "Git", category: "CLIs", desc: "Version control", Icon: SiGit },
  { id: "gh", name: "GitHub CLI", category: "CLIs", desc: "GitHub from CLI", Icon: SiGithub },
  { id: "tmux", name: "Tmux", category: "CLIs", desc: "Terminal multiplexer", Icon: SiTmux },
  { id: "bat", name: "bat", category: "CLIs", desc: "cat clone with wings", Icon: TbBox },
  { id: "eza", name: "eza", category: "CLIs", desc: "Modern ls", Icon: TbBox },
  { id: "ripgrep", name: "ripgrep", category: "CLIs", desc: "Fast grep", Icon: TbBox },
  { id: "fzf", name: "fzf", category: "CLIs", desc: "Fuzzy finder", Icon: TbBox },
  { id: "jq", name: "jq", category: "CLIs", desc: "JSON processor", Icon: TbBox },
];

const categories = ["All", ...Array.from(new Set(environments.map((e) => e.category)))];

export default function QuickInstall() {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [output, setOutput] = useState("");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const checkStatus = async () => {
    setLoading(true);
    try { setStatus(await invoke("check_install_status", { envs: environments.map((e) => e.id) }) as Record<string, boolean>); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const installSelected = async () => {
    if (selected.size === 0) return;
    setInstalling(true);
    setOutput(`Starting bulk installation for ${selected.size} items...\n`);
    try {
      const raw = await invoke("quick_install_bulk", { envs: Array.from(selected) }) as string;
      setOutput((prev) => prev + raw);
    } catch (e) { setOutput((prev) => prev + "\nError: " + e); }
    setInstalling(false);
    setSelected(new Set());
    checkStatus();
  };

  useEffect(() => { checkStatus(); }, []);

  const filteredEnvs = useMemo(() => {
    return environments.filter((e) => {
      const matchCat = activeCat === "All" || e.category === activeCat;
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCat]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbBolt size={22} /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Environments <span className="badge badge-primary badge-sm ml-1">{environments.length}+</span></h2>
            <p className="text-sm text-base-content/50 mt-0.5">1-click bootstrap for developer toolchains</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-outline gap-1" onClick={checkStatus} disabled={loading || installing}>
            <TbRefresh className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <button className="btn btn-sm btn-primary gap-1" onClick={installSelected} disabled={selected.size === 0 || installing}>
            {installing ? <span className="loading loading-spinner loading-xs" /> : <TbDownload size={14} />} Install ({selected.size})
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Category sidebar */}
        <div className="w-40 bg-base-200/50 border-r border-base-content/10 overflow-y-auto flex flex-col p-2 space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeCat === cat ? "bg-primary text-primary-content" : "hover:bg-base-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 bg-base-100 flex flex-col min-w-0 border-r border-base-content/10">
          <div className="p-3 border-b border-base-content/10 flex items-center gap-2 shrink-0">
            <TbSearch className="text-base-content/50" size={14} />
            <input type="text" placeholder="Search environments..." className="bg-transparent outline-none text-sm w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredEnvs.map((env) => {
                const isInstalled = status[env.id];
                const isSelected = selected.has(env.id);
                return (
                  <div
                    key={env.id}
                    className={`rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer select-none ${
                      isSelected ? "border-primary bg-primary/5 shadow-sm" :
                      isInstalled ? "border-success/30 bg-success/5" : "border-base-content/10 bg-base-200/30 hover:bg-base-200"
                    }`}
                    onClick={() => { if (!isInstalled && !installing) toggleSelect(env.id); }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 min-w-0">
                        <env.Icon className={`text-xl ${isInstalled ? "text-success" : "opacity-80"}`} />
                        <h3 className="font-bold text-sm truncate">{env.name}</h3>
                      </div>
                      {loading ? (
                        <span className="loading loading-spinner loading-xs opacity-50 shrink-0" />
                      ) : isInstalled ? (
                        <span className="text-[9px] uppercase tracking-wider text-success font-bold shrink-0">✓</span>
                      ) : (
                        <div className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-primary-content" : "border-base-content/30"}`}>
                          {isSelected && <TbCheckbox className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-base-content/60 mt-1">{env.desc}</p>
                  </div>
                );
              })}
              {filteredEnvs.length === 0 && <div className="col-span-full text-center text-sm text-base-content/40 py-12">No environments found.</div>}
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="w-72 bg-base-300 flex flex-col shrink-0">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Install Log</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[10px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {output || <span className="text-base-content/30 italic">Select tools and click Install.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
