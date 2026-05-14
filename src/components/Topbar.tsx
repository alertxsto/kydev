import { useState, useEffect, useRef } from "react";
import { TbSearch, TbPalette, TbCheck } from "react-icons/tb";

type NavItem = { id: string; label: string; icon: React.ElementType };
type ThemeOption = { id: string; label: string; accent: string };

interface TopbarProps {
  active: string;
  navItems: NavItem[];
  theme: string;
  themes: ThemeOption[];
  onThemeChange: (id: string) => void;
  localVersion: string;
  remoteVersion: string | null;
  updateStatus: "idle" | "running" | "success" | "error";
  updating: boolean;
  updateLog: string;
  onUpdate: () => void;
  onSearch: () => void;
}

export default function Topbar({
  active, navItems, theme, themes, onThemeChange,
  localVersion, remoteVersion, updateStatus, updating, updateLog,
  onUpdate, onSearch,
}: TopbarProps) {
  const [showTheme, setShowTheme] = useState(false);
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const [titleKey, setTitleKey] = useState(active);
  const themeRef = useRef<HTMLDivElement>(null);
  const updateRef = useRef<HTMLDivElement>(null);

  // Animate page title on change
  useEffect(() => {
    setTitleKey(active);
  }, [active]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setShowTheme(false);
      if (updateRef.current && !updateRef.current.contains(e.target as Node)) setShowUpdateLog(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeItem = navItems.find(i => i.id === active);
  const Icon = activeItem?.icon;

  return (
    <header
      className="shrink-0 flex items-center gap-3 px-4 relative z-30"
      style={{
        height: "var(--topbar-h)",
        background: "linear-gradient(90deg, var(--color-base-300) 0%, color-mix(in srgb, var(--color-base-300) 85%, var(--color-base-200)) 100%)",
        borderBottom: "1px solid color-mix(in srgb, var(--color-base-content) 7%, transparent)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0 select-none"
        style={{ width: "var(--rail-w)", paddingLeft: "2px" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 55%, var(--color-secondary)) 100%)",
            boxShadow: "0 2px 10px color-mix(in srgb, var(--color-primary) 30%, transparent)",
          }}
        >
          K
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 shrink-0" style={{ background: "color-mix(in srgb, var(--color-base-content) 10%, transparent)" }} />

      {/* Current page title — animated on change */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {Icon && (
          <Icon
            key={titleKey + "_icon"}
            size={15}
            className="shrink-0 text-primary opacity-80 animate-title-swap"
          />
        )}
        <span
          key={titleKey}
          className="font-semibold text-sm truncate animate-title-swap"
          style={{ color: "var(--color-base-content)", opacity: 0.85 }}
        >
          {activeItem?.label ?? "KyDev"}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Search */}
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center gap-2 h-7 px-2.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-content/[0.06] transition-all duration-150 text-xs font-medium"
          title="Command Palette (Ctrl+K)"
        >
          <TbSearch size={13} />
          <span className="hidden sm:inline opacity-60">Ctrl+K</span>
        </button>

        {/* Update indicator */}
        {(remoteVersion || updateStatus !== "idle") && (
          <div ref={updateRef} className="relative">
            <button
              type="button"
              onClick={() => updateStatus === "idle" ? onUpdate() : setShowUpdateLog(p => !p)}
              disabled={updating}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold transition-all duration-150
                ${updateStatus === "running" ? "text-warning bg-warning/10" :
                  updateStatus === "success" ? "text-success bg-success/10" :
                  updateStatus === "error"   ? "text-error bg-error/10" :
                  "text-primary bg-primary/10 hover:bg-primary/15"}`}
              title={remoteVersion ? `v${remoteVersion} available` : "Update status"}
            >
              {updateStatus === "running" ? (
                <span className="loading loading-spinner loading-xs" />
              ) : updateStatus === "success" ? (
                <TbCheck size={13} />
              ) : (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                </span>
              )}
              <span className="hidden sm:inline">
                {updateStatus === "running" ? "Updating…" :
                 updateStatus === "success" ? "Done!" :
                 updateStatus === "error"   ? "Failed" :
                 `v${remoteVersion}`}
              </span>
            </button>

            {/* Update log dropdown */}
            {showUpdateLog && updateLog && (
              <div
                className="absolute top-full right-0 mt-1.5 rounded-xl shadow-2xl border w-72 z-50 animate-scale-in"
                style={{
                  background: "var(--color-base-300)",
                  borderColor: "color-mix(in srgb, var(--color-base-content) 10%, transparent)",
                }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Update Log</p>
                </div>
                <pre className="p-3 text-[10px] font-mono text-base-content/60 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {updateLog.split("\n").slice(-20).join("\n")}
                </pre>
                {updateStatus === "success" && (
                  <div className="px-3 pb-3">
                    <button className="btn btn-success btn-xs btn-block rounded-lg" onClick={() => window.location.reload()}>
                      Relaunch
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme picker */}
        <div ref={themeRef} className="relative">
          <button
            type="button"
            onClick={() => setShowTheme(p => !p)}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-base-content/35 hover:text-base-content hover:bg-base-content/[0.06] transition-all duration-150"
            title="Theme"
          >
            <TbPalette size={15} />
          </button>

          {showTheme && (
            <div
              className="absolute top-full right-0 mt-1.5 rounded-xl shadow-2xl border overflow-hidden min-w-[148px] z-50 animate-scale-in"
              style={{
                background: "var(--color-base-300)",
                borderColor: "color-mix(in srgb, var(--color-base-content) 10%, transparent)",
              }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-base-content) 8%, transparent)" }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-base-content/40">Theme</p>
              </div>
              {themes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onThemeChange(t.id); setShowTheme(false); }}
                  className={`w-full text-left px-3 py-2 text-[11px] transition-colors duration-100 flex items-center gap-2.5
                    ${theme === t.id ? "font-bold text-primary bg-primary/5" : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.04]"}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-base-content/10"
                    style={{ background: t.accent }}
                  />
                  {t.label}
                  {theme === t.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Version */}
        <span className="hidden sm:block text-[10px] font-mono opacity-25 select-none pl-1">
          v{localVersion || "0.8.8"}
        </span>

      </div>
    </header>
  );
}
