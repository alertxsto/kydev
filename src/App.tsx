import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import Projects from "./pages/Projects";
import Ports from "./pages/Ports";
import Config from "./pages/Config";
import Search from "./pages/Search";
import DevTools from "./pages/DevTools";
import QuickInstall from "./pages/QuickInstall";
import Scaffolder from "./pages/Scaffolder";
import DockerManager from "./pages/Docker";
import ApiTester from "./pages/ApiTester";
import Tunnel from "./pages/Tunnel";
import DatabaseStudio from "./pages/Database";
import Git from "./pages/Git";
import Dashboard from "./pages/Dashboard";
import Hermes from "./pages/Hermes";
import CommandPalette from "./components/CommandPalette";
import Services from "./pages/Services";
import EnvStudio from "./pages/EnvStudio";
import {
  TbFolder, TbBolt, TbBox, TbNetwork, TbTools, TbSettings, TbWand,
  TbBrandDocker, TbApi, TbWorldWww, TbDatabase, TbGitBranch, TbLayoutDashboard,
  TbMessageChatbot, TbServer, TbLock, TbChevronLeft, TbChevronRight,
  TbPalette,
} from "react-icons/tb";

// ── Nav Groups ────────────────────────────────────────────────────────

const navGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: TbLayoutDashboard },
    ],
  },
  {
    label: "Dev",
    items: [
      { id: "projects", label: "Projects", icon: TbFolder },
      { id: "scaffold", label: "Bootstrapper", icon: TbWand },
      { id: "git", label: "Git", icon: TbGitBranch },
      { id: "api", label: "API Tester", icon: TbApi },
      { id: "devtools", label: "DevTools", icon: TbTools },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { id: "docker", label: "Docker", icon: TbBrandDocker },
      { id: "services", label: "Services", icon: TbServer },
      { id: "database", label: "Databases", icon: TbDatabase },
      { id: "tunnel", label: "Tunneling", icon: TbWorldWww },
      { id: "network", label: "Network", icon: TbNetwork },
    ],
  },
  {
    label: "Environment",
    items: [
      { id: "env", label: "Env Studio", icon: TbLock },
      { id: "environments", label: "Environments", icon: TbBolt },
      { id: "packages", label: "Packages", icon: TbBox },
    ],
  },
  {
    label: "System",
    items: [
      { id: "config", label: "Config", icon: TbSettings },
      { id: "hermes", label: "Hermes", icon: TbMessageChatbot },
    ],
  },
];

// Flat list for CommandPalette
const navItems = navGroups.flatMap(g => g.items);

// ── Theme Options ─────────────────────────────────────────────────────

const themes = [
  { id: "business", label: "Business" },
  { id: "dim", label: "Dim" },
  { id: "dracula", label: "Dracula" },
  { id: "synthwave", label: "Synthwave" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "nord", label: "Nord" },
  { id: "night", label: "Night" },
  { id: "forest", label: "Forest" },
];

interface UpdateStatus { log: string; running: string; success: string; }

// ── Main App ──────────────────────────────────────────────────────────

function App() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("business");
  const [localVersion, setLocalVersion] = useState("");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [updateLog, setUpdateLog] = useState("");
  const [updatePid, setUpdatePid] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // ── Persistence ───────────────────────────────────────────────────

  useEffect(() => {
    invoke<string>("load_state_file").then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.activeTab) setActive(s.activeTab);
        if (typeof s.sidebarCollapsed === "boolean") setCollapsed(s.sidebarCollapsed);
        if (s.theme) setTheme(s.theme);
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const state = JSON.stringify({ activeTab: active, sidebarCollapsed: collapsed, theme });
    invoke("save_state_file", { state }).catch(() => {});
    const t = setInterval(() => invoke("save_state_file", { state }).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [active, collapsed, theme]);

  // ── Update Logic ──────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const ver = await getVersion();
        setLocalVersion(ver);
        const res = await fetch("https://raw.githubusercontent.com/alertxsto/kydev/main/package.json");
        const data = await res.json();
        if (data.version && data.version !== ver) {
          const r = data.version.split(".").map(Number);
          const l = ver.split(".").map(Number);
          let newer = false;
          for (let i = 0; i < 3; i++) {
            if (r[i] > l[i]) { newer = true; break; }
            if (r[i] < l[i]) break;
          }
          if (newer) setRemoteVersion(data.version);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!updatePid || updateStatus !== "running") return;
    const t = setInterval(async () => {
      const s = await invoke<UpdateStatus>("check_update_status", { pid: updatePid });
      if (s.log) setUpdateLog(s.log);
      if (s.running !== "running") {
        clearInterval(t);
        setUpdateStatus(s.success === "true" ? "success" : "error");
        if (s.success === "true") { setRemoteVersion(null); setLocalVersion(await getVersion()); }
      }
    }, 1500);
    return () => clearInterval(t);
  }, [updatePid, updateStatus]);

  const handleUpdate = async () => {
    setUpdating(true); setUpdateStatus("running"); setUpdateLog("Starting update...");
    try { setUpdatePid(await invoke<string>("run_kydev_update")); }
    catch (e) { setUpdateStatus("error"); setUpdateLog(`Failed: ${e}`); }
  };

  // ── Pages ─────────────────────────────────────────────────────────

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />, projects: <Projects />, scaffold: <Scaffolder />,
    docker: <DockerManager />, api: <ApiTester />, tunnel: <Tunnel />,
    database: <DatabaseStudio />, services: <Services />, environments: <QuickInstall />,
    env: <EnvStudio />, packages: <Search />, network: <Ports />,
    devtools: <DevTools />, git: <Git />, config: <Config />, hermes: <Hermes />,
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div
      className="h-full flex font-sans selection:bg-primary selection:text-primary-content text-base-content"
      data-theme={theme}
      style={{ background: "var(--color-base-100)" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`${collapsed ? "w-[60px]" : "w-[200px]"} shrink-0 flex flex-col transition-all duration-300 ease-in-out relative`}
        style={{
          background: "linear-gradient(180deg, var(--color-base-300) 0%, var(--color-base-200) 100%)",
          borderRight: "1px solid color-mix(in srgb, var(--color-base-content) 8%, transparent)",
        }}
      >
        {/* ── Logo ── */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b shrink-0`} style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 60%, var(--color-secondary)) 100%)" }}
          >
            K
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm leading-none tracking-wide">KyDev</p>
              <p className="text-[10px] opacity-40 mt-0.5 uppercase tracking-widest leading-none">Toolbox</p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-30 px-2 mb-1.5">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 group relative
                        ${collapsed ? "justify-center p-2.5" : "px-2.5 py-2"}
                        ${isActive
                          ? "text-primary-content"
                          : "text-base-content/50 hover:text-base-content hover:bg-base-content/5"
                        }`}
                      style={isActive ? {
                        background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary)) 100%)",
                        boxShadow: "0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)",
                      } : {}}
                    >
                      <Icon
                        size={16}
                        className={`shrink-0 transition-all duration-150 ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`}
                      />
                      {!collapsed && (
                        <span className="text-[13px] font-medium truncate leading-none">{item.label}</span>
                      )}
                      {collapsed && isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: "var(--color-primary)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Update Banner ── */}
        {!collapsed && updateStatus === "idle" && remoteVersion && (
          <div className="mx-2 mb-2 rounded-xl p-3 border" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)", background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-primary)" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--color-primary)" }} />
              </span>
              <p className="text-[10px] font-bold" style={{ color: "var(--color-primary)" }}>v{remoteVersion} available</p>
            </div>
            <button className="btn btn-xs btn-primary w-full" onClick={handleUpdate} disabled={updating}>
              {updating ? "Starting..." : "Update Now"}
            </button>
          </div>
        )}
        {!collapsed && updateStatus === "running" && (
          <div className="mx-2 mb-2 rounded-xl p-3 border border-warning/20 bg-warning/5">
            <p className="text-[10px] font-bold text-warning mb-2 flex items-center gap-1.5"><span className="loading loading-spinner loading-xs" /> Updating...</p>
            <div className="rounded-lg p-2 bg-base-300 text-[8px] font-mono text-warning/80 max-h-24 overflow-y-auto whitespace-pre-wrap">{updateLog.split("\n").slice(-10).join("\n")}</div>
          </div>
        )}
        {!collapsed && updateStatus === "success" && (
          <div className="mx-2 mb-2 rounded-xl p-3 border border-success/20 bg-success/5">
            <p className="text-[10px] font-bold text-success mb-2">✓ Update complete!</p>
            <button className="btn btn-xs btn-success w-full" onClick={() => window.location.reload()}>Relaunch</button>
          </div>
        )}
        {!collapsed && updateStatus === "error" && (
          <div className="mx-2 mb-2 rounded-xl p-3 border border-error/20 bg-error/5">
            <p className="text-[10px] font-bold text-error mb-2">✗ Update failed</p>
            <button className="btn btn-xs btn-outline w-full" onClick={() => setUpdateStatus("idle")}>Try Again</button>
          </div>
        )}

        {/* ── Footer ── */}
        <div
          className={`shrink-0 px-2 py-3 flex items-center gap-2 border-t ${collapsed ? "justify-center flex-col" : "justify-between"}`}
          style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}
        >
          {/* Theme picker */}
          <div className="relative">
            <button
              className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content rounded-lg"
              onClick={() => setShowThemePicker(p => !p)}
              title="Change theme"
            >
              <TbPalette size={14} />
              {!collapsed && <span className="text-[10px] font-mono">{theme}</span>}
            </button>
            {showThemePicker && (
              <div
                className="absolute bottom-full left-0 mb-2 rounded-xl overflow-hidden shadow-2xl z-50 border min-w-[130px]"
                style={{ background: "var(--color-base-300)", borderColor: "color-mix(in srgb, var(--color-base-content) 12%, transparent)" }}
              >
                {themes.map((t) => (
                  <button
                    key={t.id}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2
                      ${theme === t.id ? "font-bold text-primary" : "text-base-content/60 hover:text-base-content hover:bg-base-content/5"}`}
                    onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      data-theme={t.id}
                      style={{ background: "var(--color-primary)" }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
            {!collapsed && (
              <span className="text-[9px] font-mono opacity-25">v{localVersion || "0.8.4"}</span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn btn-ghost btn-xs text-base-content/30 hover:text-base-content rounded-lg"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <TbChevronRight size={14} /> : <TbChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col" style={{ background: "var(--color-base-100)" }}>
        {navItems.map((item) => (
          <div key={item.id} className={`h-full overflow-y-auto ${active === item.id ? "block" : "hidden"}`}>
            {pages[item.id]}
          </div>
        ))}
      </main>

      <CommandPalette items={navItems} onSelect={setActive} />
    </div>
  );
}

export default App;
