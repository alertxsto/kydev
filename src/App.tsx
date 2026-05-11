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
import { TbFolder, TbBolt, TbBox, TbNetwork, TbTools, TbSettings, TbTool, TbWand, TbBrandDocker, TbApi, TbWorldWww, TbDatabase } from "react-icons/tb";

const navItems = [
  { id: "projects", label: "Projects", icon: TbFolder },
  { id: "scaffold", label: "Bootstrapper", icon: TbWand },
  { id: "docker", label: "Docker", icon: TbBrandDocker },
  { id: "api", label: "API Tester", icon: TbApi },
  { id: "tunnel", label: "Tunneling", icon: TbWorldWww },
  { id: "database", label: "Databases", icon: TbDatabase },
  { id: "environments", label: "Environments", icon: TbBolt },
  { id: "packages", label: "Packages", icon: TbBox },
  { id: "network", label: "Network", icon: TbNetwork },
  { id: "devtools", label: "DevTools", icon: TbTools },
  { id: "config", label: "Config", icon: TbSettings },
];

function App() {
  const [active, setActive] = useState("projects");
  const [localVersion, setLocalVersion] = useState("");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const ver = await getVersion();
        setLocalVersion(ver);
        const res = await fetch("https://raw.githubusercontent.com/alertxsto/kydev/main/package.json");
        const data = await res.json();
        if (data.version && data.version !== ver) {
          const remoteParts = data.version.split('.').map(Number);
          const localParts = ver.split('.').map(Number);
          let isNewer = false;
          for (let i = 0; i < 3; i++) {
            if (remoteParts[i] > localParts[i]) { isNewer = true; break; }
            if (remoteParts[i] < localParts[i]) { break; }
          }
          if (isNewer) {
            setRemoteVersion(data.version);
          }
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    };
    checkUpdate();
  }, []);

  return (
    <div className="h-full flex text-base-content bg-base-100 font-sans selection:bg-primary selection:text-primary-content" data-theme="business">
      {/* Sidebar - Sharp, dense, professional */}
      <aside className="w-48 bg-base-300 flex flex-col shrink-0 border-r border-base-content/10">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-base-content/10 bg-base-200">
          <div className="flex items-center gap-2">
            <TbTool className="text-xl text-primary" />
            <div>
              <h1 className="font-bold text-sm tracking-wide">KyDev</h1>
              <p className="text-[9px] uppercase tracking-wider text-neutral-content/60">Linux Toolbox</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                  active === item.id 
                    ? "bg-primary/10 text-primary border-l-2 border-primary font-medium" 
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content border-l-2 border-transparent"
                }`}
              >
                <Icon className="text-lg opacity-80" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Update Notification */}
        {remoteVersion && (
          <div className="px-4 py-3 border-t border-primary/20 bg-primary/10 shrink-0">
            <p className="text-[10px] font-bold text-primary mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Update v{remoteVersion} Available
            </p>
            <button className="btn btn-xs btn-primary w-full shadow-lg shadow-primary/20" onClick={() => invoke("run_kydev_update")}>
              Update Now
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-base-content/10 bg-base-200 shrink-0">
          <p className="text-[10px] text-base-content/40 font-mono">v{localVersion || "0.5.1"}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-base-100 p-0 flex flex-col">
        <div className={`h-full ${active === "projects" ? "block" : "hidden"}`}><Projects /></div>
        <div className={`h-full ${active === "scaffold" ? "block" : "hidden"}`}><Scaffolder /></div>
        <div className={`h-full ${active === "docker" ? "block" : "hidden"}`}><DockerManager /></div>
        <div className={`h-full ${active === "api" ? "block" : "hidden"}`}><ApiTester /></div>
        <div className={`h-full ${active === "tunnel" ? "block" : "hidden"}`}><Tunnel /></div>
        <div className={`h-full ${active === "database" ? "block" : "hidden"}`}><DatabaseStudio /></div>
        <div className={`h-full ${active === "environments" ? "block" : "hidden"}`}><QuickInstall /></div>
        <div className={`h-full ${active === "packages" ? "block" : "hidden"}`}><Search /></div>
        <div className={`h-full ${active === "network" ? "block" : "hidden"}`}><Ports /></div>
        <div className={`h-full ${active === "devtools" ? "block" : "hidden"}`}><DevTools /></div>
        <div className={`h-full ${active === "config" ? "block" : "hidden"}`}><Config /></div>
      </main>
    </div>
  );
}

export default App;
