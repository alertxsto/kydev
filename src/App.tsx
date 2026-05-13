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
import SnippetVault from "./pages/SnippetVault";
import SshManager from "./pages/SshManager";
import QuickNotes from "./components/QuickNotes";
import {
  TbFolder, TbBolt, TbBox, TbNetwork, TbTools, TbSettings, TbWand,
  TbBrandDocker, TbApi, TbWorldWww, TbDatabase, TbGitBranch, TbLayoutDashboard,
  TbMessageChatbot, TbServer, TbLock, TbChevronLeft, TbChevronRight, TbChevronDown,
  TbPalette, TbTerminal2, TbServer2, TbNotes,
} from "react-icons/tb";

// ── Nav (short sidebar labels; full `label` for palette & tooltips) ─────

type NavItem = { id: string; label: string; shortLabel: string; icon: typeof TbFolder };
type NavGroup = { id: string; label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", shortLabel: "Overview", icon: TbLayoutDashboard },
      { id: "projects", label: "Projects", shortLabel: "Projects", icon: TbFolder },
      { id: "scaffold", label: "Bootstrapper", shortLabel: "Scaffold", icon: TbWand },
      { id: "git", label: "Git", shortLabel: "Git", icon: TbGitBranch },
      { id: "api", label: "API Tester", shortLabel: "API", icon: TbApi },
      { id: "devtools", label: "DevTools", shortLabel: "DevTools", icon: TbTools },
    ],
  },
  {
    id: "hosts",
    label: "Hosts & net",
    items: [
      { id: "docker", label: "Docker", shortLabel: "Docker", icon: TbBrandDocker },
      { id: "services", label: "Services", shortLabel: "Services", icon: TbServer },
      { id: "database", label: "Databases", shortLabel: "DB", icon: TbDatabase },
      { id: "tunnel", label: "Tunneling", shortLabel: "Tunnel", icon: TbWorldWww },
      { id: "network", label: "Network", shortLabel: "Ports", icon: TbNetwork },
      { id: "ssh", label: "SSH Manager", shortLabel: "SSH", icon: TbServer2 },
    ],
  },
  {
    id: "files",
    label: "Env & system",
    items: [
      { id: "env", label: "Env Studio", shortLabel: ".env", icon: TbLock },
      { id: "environments", label: "Environments", shortLabel: "Stacks", icon: TbBolt },
      { id: "packages", label: "Packages", shortLabel: "Packages", icon: TbBox },
      { id: "snippets", label: "Snippet Vault", shortLabel: "Snippets", icon: TbTerminal2 },
      { id: "config", label: "Config", shortLabel: "Config", icon: TbSettings },
      { id: "hermes", label: "Hermes", shortLabel: "Hermes", icon: TbMessageChatbot },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

const defaultNavSectionsOpen = (): Record<string, boolean> =>
  Object.fromEntries(navGroups.map((g) => [g.id, true]));

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
  const [showNotes, setShowNotes] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [navSectionsOpen, setNavSectionsOpen] = useState<Record<string, boolean>>(defaultNavSectionsOpen);

  // ── Persistence ───────────────────────────────────────────────────

  useEffect(() => {
    invoke<string>("load_state_file").then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.activeTab) setActive(s.activeTab);
        if (typeof s.sidebarCollapsed === "boolean") setCollapsed(s.sidebarCollapsed);
        if (s.theme) setTheme(s.theme);
        if (s.navSectionsOpen && typeof s.navSectionsOpen === "object") {
          setNavSectionsOpen({ ...defaultNavSectionsOpen(), ...s.navSectionsOpen });
        }
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const state = JSON.stringify({
      activeTab: active,
      sidebarCollapsed: collapsed,
      theme,
      navSectionsOpen,
    });
    invoke("save_state_file", { state }).catch(() => {});
    const t = setInterval(() => invoke("save_state_file", { state }).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [active, collapsed, theme, navSectionsOpen]);

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

  // ── Visited pages cache (keep mounted once visited, never re-mount) ──
  const [visited, setVisited] = useState<Set<string>>(new Set(["dashboard"]));
  useEffect(() => {
    setVisited(prev => new Set([...prev, active]));
  }, [active]);

  const renderPage = (id: string) => {
    switch(id) {
      case "dashboard": return <Dashboard />;
      case "projects": return <Projects />;
      case "scaffold": return <Scaffolder />;
      case "docker": return <DockerManager />;
      case "api": return <ApiTester />;
      case "tunnel": return <Tunnel />;
      case "database": return <DatabaseStudio />;
      case "services": return <Services />;
      case "ssh": return <SshManager />;
      case "environments": return <QuickInstall />;
      case "env": return <EnvStudio />;
      case "snippets": return <SnippetVault />;
      case "packages": return <Search />;
      case "network": return <Ports />;
      case "devtools": return <DevTools />;
      case "git": return <Git />;
      case "config": return <Config />;
      case "hermes": return <Hermes />;
      default: return null;
    }
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
        className={`${collapsed ? "w-[52px]" : "w-[178px]"} shrink-0 flex flex-col transition-[width] duration-200 ease-out relative`}
        style={{
          background: "linear-gradient(180deg, var(--color-base-300) 0%, var(--color-base-200) 100%)",
          borderRight: "1px solid color-mix(in srgb, var(--color-base-content) 8%, transparent)",
        }}
      >
        {/* ── Logo ── */}
        <div
          className={`flex items-center border-b shrink-0 ${collapsed ? "justify-center py-2.5 px-1" : "gap-2.5 px-3 py-2.5"}`}
          style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-black text-xs shadow-md"
            style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 60%, var(--color-secondary)) 100%)" }}
          >
            K
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="font-bold text-[13px] leading-none tracking-tight truncate">KyDev</p>
              <p className="text-[9px] opacity-35 mt-0.5 uppercase tracking-wide leading-none">Toolbox</p>
            </div>
          )}
        </div>

        {/* ── Nav: collapsed = flat icon rail; expanded = foldable sections ── */}
        {collapsed ? (
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-1 space-y-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors relative
                    ${isActive ? "text-primary-content" : "text-base-content/45 hover:text-base-content hover:bg-base-content/[0.06]"}`}
                  style={isActive ? {
                    background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 72%, var(--color-secondary)) 100%)",
                    boxShadow: "0 2px 8px color-mix(in srgb, var(--color-primary) 28%, transparent)",
                  } : {}}
                >
                  <Icon size={18} className={`shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`} />
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-primary-content/90"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-1.5 space-y-0.5">
            {navGroups.map((group) => {
              const open = navSectionsOpen[group.id] !== false;
              return (
                <div key={group.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setNavSectionsOpen((o) => ({ ...o, [group.id]: !open }))}
                    className="w-full flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-base-content/[0.04] text-left min-w-0"
                  >
                    <span className="shrink-0 text-base-content/35 flex items-center justify-center w-3.5">
                      {open ? <TbChevronDown size={12} /> : <TbChevronRight size={12} />}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-base-content/35 truncate">{group.label}</span>
                  </button>
                  {open && (
                    <div className="space-y-px mt-0.5 pl-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = active === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActive(item.id)}
                            title={item.label}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-100 group relative min-w-0
                              ${isActive
                                ? "text-primary-content"
                                : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.06]"
                              }`}
                            style={isActive ? {
                              background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 72%, var(--color-secondary)) 100%)",
                              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-primary) 28%, transparent)",
                            } : {}}
                          >
                            <Icon size={15} className={`shrink-0 ${isActive ? "opacity-100" : "opacity-65 group-hover:opacity-85"}`} />
                            <span className="text-[12px] font-medium truncate leading-tight">{item.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* ── Update (compact; hidden when rail collapsed) ── */}
        {!collapsed && updateStatus === "idle" && remoteVersion && (
          <div className="mx-1.5 mb-1.5 rounded-lg px-2 py-2 border border-primary/25 bg-primary/5">
            <div className="flex items-center gap-1 mb-1.5">
              <span className="relative flex h-1 w-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary" />
                <span className="relative inline-flex rounded-full h-1 w-1 bg-primary" />
              </span>
              <p className="text-[9px] font-bold text-primary leading-none truncate">v{remoteVersion}</p>
            </div>
            <button className="btn btn-xs btn-primary btn-block min-h-0 h-7 text-[10px]" onClick={handleUpdate} disabled={updating}>
              {updating ? "…" : "Update"}
            </button>
          </div>
        )}
        {!collapsed && updateStatus === "running" && (
          <div className="mx-1.5 mb-1.5 rounded-lg px-2 py-2 border border-warning/20 bg-warning/5">
            <p className="text-[9px] font-bold text-warning mb-1 flex items-center gap-1"><span className="loading loading-spinner loading-xs" /> Update</p>
            <div className="rounded-md px-1.5 py-1 bg-base-300 text-[7px] font-mono text-warning/80 max-h-16 overflow-y-auto whitespace-pre-wrap leading-snug">{updateLog.split("\n").slice(-8).join("\n")}</div>
          </div>
        )}
        {!collapsed && updateStatus === "success" && (
          <div className="mx-1.5 mb-1.5 rounded-lg px-2 py-2 border border-success/20 bg-success/5">
            <p className="text-[9px] font-bold text-success mb-1">Done</p>
            <button className="btn btn-xs btn-success btn-block min-h-0 h-7 text-[10px]" onClick={() => window.location.reload()}>Relaunch</button>
          </div>
        )}
        {!collapsed && updateStatus === "error" && (
          <div className="mx-1.5 mb-1.5 rounded-lg px-2 py-2 border border-error/20 bg-error/5">
            <p className="text-[9px] font-bold text-error mb-1">Failed</p>
            <button className="btn btn-xs btn-outline btn-block min-h-0 h-7 text-[10px]" onClick={() => setUpdateStatus("idle")}>Retry</button>
          </div>
        )}

        {/* ── Footer ── */}
        <div
          className={`shrink-0 px-1.5 py-2 flex items-center gap-1 border-t ${collapsed ? "justify-center flex-col gap-1" : "justify-between"}`}
          style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}
        >
          <div className="relative">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square min-h-0 h-7 w-7 text-base-content/40 hover:text-base-content rounded-md"
              onClick={() => setShowThemePicker((p) => !p)}
              title="Theme"
            >
              <TbPalette size={15} />
            </button>
            {showThemePicker && (
              <div
                className="absolute bottom-full left-0 mb-1.5 rounded-lg overflow-hidden shadow-2xl z-50 border min-w-[124px]"
                style={{ background: "var(--color-base-300)", borderColor: "color-mix(in srgb, var(--color-base-content) 12%, transparent)" }}
              >
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`w-full text-left px-2.5 py-1.5 text-[11px] transition-colors flex items-center gap-2
                      ${theme === t.id ? "font-bold text-primary bg-base-content/[0.04]" : "text-base-content/60 hover:text-base-content hover:bg-base-content/5"}`}
                    onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      data-theme={t.id}
                      style={{ background: "var(--color-primary)" }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`flex items-center min-w-0 ${collapsed ? "" : "gap-1"}`}>
            {!collapsed && (
              <span className="text-[8px] font-mono opacity-30 truncate max-w-[4.5rem]">v{localVersion || "0.8.7"}</span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="btn btn-ghost btn-xs btn-square min-h-0 h-7 w-7 text-base-content/35 hover:text-base-content rounded-md"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <TbChevronRight size={15} /> : <TbChevronLeft size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col relative" style={{ background: "var(--color-base-100)" }}>
        {/* Only render pages that have been visited — prevents all 18 pages mounting at startup */}
        {navItems.map((item) => (
          visited.has(item.id) ? (
            <div key={item.id} className={`h-full overflow-y-auto ${active === item.id ? "flex flex-col" : "hidden"}`}>
              {renderPage(item.id)}
            </div>
          ) : null
        ))}
        {/* Floating Notes Button */}
        <button
          className="fixed bottom-6 right-6 z-40 btn btn-circle btn-primary shadow-lg shadow-primary/30"
          onClick={() => setShowNotes(p => !p)}
          title="Quick Notes"
        >
          <TbNotes size={20} />
        </button>
      </main>

      <CommandPalette items={navItems} onSelect={setActive} />
      <QuickNotes open={showNotes} onClose={() => setShowNotes(false)} />
    </div>
  );
}

export default App;
