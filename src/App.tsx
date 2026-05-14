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
import Services from "./pages/Services";
import EnvStudio from "./pages/EnvStudio";
import SnippetVault from "./pages/SnippetVault";
import SshManager from "./pages/SshManager";
import Topbar from "./components/Topbar";
import CommandPalette from "./components/CommandPalette";
import QuickNotes from "./components/QuickNotes";
import {
  TbFolder, TbBolt, TbBox, TbNetwork, TbTools, TbSettings, TbWand,
  TbBrandDocker, TbApi, TbWorldWww, TbDatabase, TbGitBranch, TbLayoutDashboard,
  TbMessageChatbot, TbServer, TbLock, TbTerminal2, TbServer2, TbNotes,
} from "react-icons/tb";

// ── Nav ───────────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; shortLabel: string; icon: typeof TbFolder };

const navItems: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",     shortLabel: "Overview",  icon: TbLayoutDashboard },
  { id: "projects",     label: "Projects",      shortLabel: "Projects",  icon: TbFolder },
  { id: "scaffold",     label: "Bootstrapper",  shortLabel: "Scaffold",  icon: TbWand },
  { id: "git",          label: "Git",           shortLabel: "Git",       icon: TbGitBranch },
  { id: "api",          label: "API Tester",    shortLabel: "API",       icon: TbApi },
  { id: "devtools",     label: "DevTools",      shortLabel: "DevTools",  icon: TbTools },
  // ── Hosts & Net
  { id: "docker",       label: "Docker",        shortLabel: "Docker",    icon: TbBrandDocker },
  { id: "services",     label: "Services",      shortLabel: "Services",  icon: TbServer },
  { id: "database",     label: "Databases",     shortLabel: "DB",        icon: TbDatabase },
  { id: "tunnel",       label: "Tunneling",     shortLabel: "Tunnel",    icon: TbWorldWww },
  { id: "network",      label: "Network",       shortLabel: "Ports",     icon: TbNetwork },
  { id: "ssh",          label: "SSH Manager",   shortLabel: "SSH",       icon: TbServer2 },
  // ── Env & System
  { id: "env",          label: "Env Studio",    shortLabel: ".env",      icon: TbLock },
  { id: "environments", label: "Environments",  shortLabel: "Stacks",    icon: TbBolt },
  { id: "packages",     label: "Packages",      shortLabel: "Packages",  icon: TbBox },
  { id: "snippets",     label: "Snippet Vault", shortLabel: "Snippets",  icon: TbTerminal2 },
  { id: "config",       label: "Config",        shortLabel: "Config",    icon: TbSettings },
  { id: "hermes",       label: "Hermes",        shortLabel: "Hermes",    icon: TbMessageChatbot },
];

// Group divider positions (index of first item in each new group)
const groupBreaks = new Set([6, 12]);

// ── Themes ────────────────────────────────────────────────────────────

const themes = [
  { id: "business",  label: "Business",  accent: "#3b82f6" },
  { id: "dim",       label: "Dim",       accent: "#6b7280" },
  { id: "dracula",   label: "Dracula",   accent: "#bd93f9" },
  { id: "synthwave", label: "Synthwave", accent: "#e879f9" },
  { id: "cyberpunk", label: "Cyberpunk", accent: "#facc15" },
  { id: "nord",      label: "Nord",      accent: "#88c0d0" },
  { id: "night",     label: "Night",     accent: "#6366f1" },
  { id: "forest",    label: "Forest",    accent: "#4ade80" },
];

interface UpdateStatus { log: string; running: string; success: string; }

// ── App ───────────────────────────────────────────────────────────────

function App() {
  const [active, setActive]               = useState("dashboard");
  const [theme, setTheme]                 = useState("business");
  const [localVersion, setLocalVersion]   = useState("");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [updating, setUpdating]           = useState(false);
  const [updateStatus, setUpdateStatus]   = useState<"idle" | "running" | "success" | "error">("idle");
  const [updateLog, setUpdateLog]         = useState("");
  const [updatePid, setUpdatePid]         = useState<string | null>(null);
  const [showNotes, setShowNotes]         = useState(false);
  const [showPalette, setShowPalette]     = useState(false);
  const [visited, setVisited]             = useState<Set<string>>(new Set(["dashboard"]));

  // ── Persistence ───────────────────────────────────────────────────

  useEffect(() => {
    invoke<string>("load_state_file").then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.activeTab) setActive(s.activeTab);
        if (s.theme)     setTheme(s.theme);
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const state = JSON.stringify({ activeTab: active, theme });
    invoke("save_state_file", { state }).catch(() => {});
    const t = setInterval(() => invoke("save_state_file", { state }).catch(() => {}), 30_000);
    return () => clearInterval(t);
  }, [active, theme]);

  // ── Version check ─────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const ver = await getVersion();
        setLocalVersion(ver);
        const res  = await fetch("https://raw.githubusercontent.com/alertxsto/kydev/main/package.json");
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

  // ── Update polling ────────────────────────────────────────────────

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
    setUpdating(true);
    setUpdateStatus("running");
    setUpdateLog("Starting update…");
    try {
      const pid = await invoke<string>("run_kydev_update");
      setUpdatePid(pid);
    } catch (e) {
      setUpdateStatus("error");
      setUpdateLog(`Failed to start: ${e}`);
    } finally {
      setUpdating(false);
    }
  };

  // ── Visited pages cache ───────────────────────────────────────────

  useEffect(() => {
    setVisited(prev => new Set([...prev, active]));
  }, [active]);

  const renderPage = (id: string) => {
    switch (id) {
      case "dashboard":    return <Dashboard />;
      case "projects":     return <Projects />;
      case "scaffold":     return <Scaffolder />;
      case "docker":       return <DockerManager />;
      case "api":          return <ApiTester />;
      case "tunnel":       return <Tunnel />;
      case "database":     return <DatabaseStudio />;
      case "services":     return <Services />;
      case "ssh":          return <SshManager />;
      case "environments": return <QuickInstall />;
      case "env":          return <EnvStudio />;
      case "snippets":     return <SnippetVault />;
      case "packages":     return <Search />;
      case "network":      return <Ports />;
      case "devtools":     return <DevTools />;
      case "git":          return <Git />;
      case "config":       return <Config />;
      case "hermes":       return <Hermes />;
      default:             return null;
    }
  };

  // ── Rail styles ───────────────────────────────────────────────────

  const railBg = {
    background: "linear-gradient(180deg, var(--color-base-300) 0%, color-mix(in srgb, var(--color-base-200) 80%, var(--color-base-100)) 100%)",
    borderRight: "1px solid color-mix(in srgb, var(--color-base-content) 6%, transparent)",
  };

  const activeIconStyle = {
    background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 68%, var(--color-secondary)) 100%)",
    boxShadow: "0 2px 10px color-mix(in srgb, var(--color-primary) 25%, transparent)",
  };

  const tooltipStyle = {
    background: "var(--color-base-300)",
    border: "1px solid color-mix(in srgb, var(--color-base-content) 12%, transparent)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div
      className="h-full flex flex-col font-sans selection:bg-primary selection:text-primary-content text-base-content"
      data-theme={theme}
      style={{ background: "var(--color-base-100)" }}
    >
      {/* ── Topbar ── */}
      <Topbar
        active={active}
        navItems={navItems}
        theme={theme}
        themes={themes}
        onThemeChange={setTheme}
        localVersion={localVersion}
        remoteVersion={remoteVersion}
        updateStatus={updateStatus}
        updating={updating}
        updateLog={updateLog}
        onUpdate={handleUpdate}
        onSearch={() => setShowPalette(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Icon Rail ── */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: "var(--rail-w)", ...railBg }}
        >
          {/* Nav icons */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-0.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <div key={item.id}>
                  {/* Group divider */}
                  {groupBreaks.has(idx) && (
                    <div
                      className="mx-2 my-1.5 h-px"
                      style={{ background: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActive(item.id)}
                    title={item.label}
                    className={`w-full flex items-center justify-center p-2 rounded-xl transition-all duration-200 relative group
                      ${isActive
                        ? "text-primary-content"
                        : "text-base-content/45 hover:text-base-content hover:bg-base-content/[0.06]"
                      }`}
                    style={isActive ? activeIconStyle : {}}
                  >
                    <Icon
                      size={19}
                      className={`shrink-0 transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-65 group-hover:opacity-100"}`}
                    />
                    {/* Tooltip */}
                    <span
                      className="absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
                      style={tooltipStyle}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Quick Notes — pinned at bottom of rail */}
          <div
            className="shrink-0 px-1.5 pb-2 pt-1"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--color-base-content) 6%, transparent)" }}
          >
            <button
              type="button"
              onClick={() => setShowNotes(p => !p)}
              title="Quick Notes"
              className={`w-full flex items-center justify-center p-2 rounded-xl transition-all duration-200 relative group
                ${showNotes
                  ? "text-primary-content"
                  : "text-base-content/40 hover:text-base-content hover:bg-base-content/[0.06]"
                }`}
              style={showNotes ? activeIconStyle : {}}
            >
              <TbNotes
                size={19}
                className={`shrink-0 transition-opacity duration-200 ${showNotes ? "opacity-100" : "opacity-65 group-hover:opacity-100"}`}
              />
              <span
                className="absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
                style={tooltipStyle}
              >
                Quick Notes
              </span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-hidden relative" style={{ background: "var(--color-base-100)" }}>
          {navItems.map(item => (
            visited.has(item.id) ? (
              <div
                key={item.id}
                className={`absolute inset-0 overflow-y-auto flex flex-col transition-opacity duration-200 ${
                  active === item.id
                    ? "opacity-100 pointer-events-auto z-10"
                    : "opacity-0 pointer-events-none z-0"
                }`}
              >
                {/* Page enter animation wrapper — only when becoming active */}
                <div className={active === item.id ? "page-enter flex-1 flex flex-col" : "flex-1 flex flex-col"}>
                  {renderPage(item.id)}
                </div>
              </div>
            ) : null
          ))}
        </main>
      </div>

      <CommandPalette
        items={navItems}
        onSelect={(id) => { setActive(id); setShowPalette(false); }}
        open={showPalette}
        onClose={() => setShowPalette(false)}
      />
      <QuickNotes open={showNotes} onClose={() => setShowNotes(false)} />
    </div>
  );
}

export default App;
