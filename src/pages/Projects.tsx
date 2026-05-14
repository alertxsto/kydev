import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import DirInput from "../components/DirInput";
import {
  TbGitBranch, TbPlayerPlayFilled, TbCode,
  TbSearch, TbCopy, TbFolderOpen, TbStar, TbStarFilled,
  TbBook, TbTrash, TbRefresh, TbChevronDown, TbLayoutGrid,
} from "react-icons/tb";

const LS_SCAN = "kydev_projects_scan_dir";
const LS_RECENT = "kydev_projects_recent_dirs";
const LS_FAV = "kydev_projects_favorites";

interface Project {
  name: string;
  path: string;
  lang: string;
  framework: string;
  git_branch: string;
  git_dirty: boolean;
  git_changed_files: number;
  scripts: string[];
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    if (!raw) return [];
    const a = JSON.parse(raw) as unknown;
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(paths: string[]) {
  const uniq = [...new Set(paths)].slice(0, 8);
  localStorage.setItem(LS_RECENT, JSON.stringify(uniq));
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FAV);
    if (!raw) return new Set();
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return new Set();
    return new Set(a.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveFavorites(paths: Set<string>) {
  localStorage.setItem(LS_FAV, JSON.stringify([...paths]));
}

function langBadgeClass(lang: string): string {
  const map: Record<string, string> = {
    JavaScript: "badge-warning/80 text-warning-content border-0",
    Rust: "badge-secondary border-0",
    Go: "badge-info border-0",
    Python: "badge-success/70 text-success-content border-0",
  };
  return map[lang] ?? "badge-ghost border border-base-content/15";
}

type SortKey = "name" | "name_desc" | "dirty" | "lang";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [homeDir, setHomeDir] = useState(() => localStorage.getItem(LS_SCAN) || "~/projects");
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [selected, setSelected] = useState<Project | null>(null);
  const [scriptOutput, setScriptOutput] = useState("");
  const [scriptRunning, setScriptRunning] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [readme, setReadme] = useState("");
  const [readmeOpen, setReadmeOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const scan = async (dir: string) => {
    setLoading(true);
    setScanned(true);
    setSelected(null);
    setScriptOutput("");
    setReadme("");
    setReadmeOpen(false);
    try {
      const expanded = await invoke<string>("expand_user_path", { path: dir.trim() });
      const res = await invoke("scan_projects", { dir: expanded });
      setProjects(res as Project[]);
      localStorage.setItem(LS_SCAN, dir.trim());
      const next = [expanded, ...recent.filter((p) => p !== expanded)];
      saveRecent(next);
      setRecent(loadRecent());
    } catch (e) {
      console.error(e);
      setProjects([]);
    }
    setLoading(false);
  };

  const toggleFavorite = useCallback((path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      saveFavorites(n);
      return n;
    });
  }, []);

  const runScript = async (p: Project, script: string) => {
    setScriptRunning(true);
    setScriptOutput(`$ ${script}\n`);
    try {
      const out = await invoke<string>("run_project_script", { path: p.path, script, lang: p.lang });
      setScriptOutput((prev) => prev + out + (out.endsWith("\n") ? "" : "\n"));
    } catch (e) {
      setScriptOutput((prev) => prev + `\n[error] ${String(e)}\n`);
    }
    setScriptRunning(false);
  };

  const openEditor = async (p: Project, editor: string) => {
    try {
      await invoke("open_in_editor", { path: p.path, editor });
    } catch (e) {
      setScriptOutput((prev) => prev + `\n[error] open editor: ${String(e)}\n`);
    }
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setScriptOutput((prev) => prev + `\nCopied path to clipboard.\n`);
    } catch {
      setScriptOutput((prev) => prev + `\nCould not copy (clipboard).\n`);
    }
  };

  const revealFolder = async (path: string) => {
    try {
      await invoke("open_path_in_file_manager", { path });
    } catch (e) {
      setScriptOutput((prev) => prev + `\n[error] open folder: ${String(e)}\n`);
    }
  };

  const stats = useMemo(() => {
    const byLang: Record<string, number> = {};
    let dirty = 0;
    let changed = 0;
    for (const p of projects) {
      byLang[p.lang] = (byLang[p.lang] || 0) + 1;
      if (p.git_dirty) dirty += 1;
      changed += p.git_changed_files || 0;
    }
    return { total: projects.length, dirty, changed, byLang };
  }, [projects]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects;
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q) ||
          p.framework.toLowerCase().includes(q) ||
          p.lang.toLowerCase().includes(q)
      );
    }
    const fav = favorites;
    const out = [...list];
    out.sort((a, b) => {
      const af = fav.has(a.path) ? 1 : 0;
      const bf = fav.has(b.path) ? 1 : 0;
      if (af !== bf) return bf - af;
      if (sort === "dirty") {
        if (a.git_dirty !== b.git_dirty) return a.git_dirty ? -1 : 1;
        if ((b.git_changed_files || 0) !== (a.git_changed_files || 0))
          return (b.git_changed_files || 0) - (a.git_changed_files || 0);
        return a.name.localeCompare(b.name);
      }
      if (sort === "lang") {
        const lc = a.lang.localeCompare(b.lang);
        if (lc !== 0) return lc;
        return a.name.localeCompare(b.name);
      }
      if (sort === "name_desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [projects, query, sort, favorites]);

  useEffect(() => {
    if (!selected) {
      setReadme("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const text = await invoke<string>("read_project_readme", { repoPath: selected.path });
        if (!cancelled) {
          setReadme(text);
          setReadmeOpen(text.length > 0);
        }
      } catch {
        if (!cancelled) setReadme("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.path]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scriptOutput]);

  const changeDirectory = () => {
    setScanned(false);
    setProjects([]);
    setSelected(null);
    setScriptOutput("");
    setQuery("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 md:p-7 border-b border-base-content/10 bg-base-200/40 shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-3xl font-bold tracking-tight">Project Control Center</h2>
            <p className="text-base text-base-content/60 mt-2 font-medium">
              Scan a folder of repos, run scripts, open tools
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {scanned && (
              <>
                <button type="button" className="btn btn-sm btn-ghost gap-2 text-base font-semibold h-10 px-4" onClick={changeDirectory}>
                  Change folder
                </button>
                <button type="button" className="btn btn-sm btn-outline gap-2 text-base font-semibold h-10 px-4" onClick={() => scan(homeDir)} disabled={loading}>
                  {loading ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={16} />}
                  Rescan
                </button>
              </>
            )}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-base-content/50 font-bold">Recent</span>
            {recent.map((p) => (
              <button
                key={p}
                type="button"
                className="btn btn-xs btn-ghost h-8 min-h-0 font-mono text-xs normal-case max-w-[200px] truncate font-semibold"
                title={p}
                onClick={() => {
                  setHomeDir(p);
                  scan(p);
                }}
              >
                {p.replace(/^.*\//, "").slice(0, 20) || p}
              </button>
            ))}
          </div>
        )}

        {!scanned && (
          <div className="max-w-xl space-y-3">
            <DirInput
              label="Scan directory"
              value={homeDir}
              onChange={setHomeDir}
              placeholder="~/projects"
              onEnter={() => scan(homeDir)}
            />
            <button type="button" className="btn btn-primary gap-2 font-bold text-base h-11 px-5" onClick={() => scan(homeDir)} disabled={loading}>
              <TbSearch size={18} /> Scan
            </button>
          </div>
        )}

        {scanned && !loading && projects.length > 0 && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="stats stats-horizontal shadow-sm bg-base-100/80 border border-base-content/10 rounded-xl text-xs">
                <div className="stat py-3 px-4 place-items-center">
                  <div className="stat-title text-xs uppercase opacity-60 font-bold">Repos</div>
                  <div className="stat-value text-2xl leading-none">{stats.total}</div>
                </div>
                <div className="stat py-3 px-4 place-items-center">
                  <div className="stat-title text-xs uppercase opacity-60 font-bold">Dirty</div>
                  <div className={`stat-value text-2xl leading-none ${stats.dirty ? "text-warning" : ""}`}>{stats.dirty}</div>
                </div>
                <div className="stat py-3 px-4 place-items-center">
                  <div className="stat-title text-xs uppercase opacity-60 font-bold">Δ files</div>
                  <div className="stat-value text-2xl leading-none">{stats.changed}</div>
                </div>
              </div>
              {Object.keys(stats.byLang).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(stats.byLang)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, n]) => (
                      <span key={lang} className={`badge badge-lg ${langBadgeClass(lang)} text-sm font-semibold py-3 px-3`}>
                        {lang} · {n}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 max-w-full">
              <label className="input input-bordered flex items-center gap-2 min-w-[140px] flex-1 max-w-xs bg-base-100/80 h-11 px-4 font-medium">
                <TbSearch size={16} className="opacity-50 shrink-0" />
                <input
                  type="search"
                  className="grow min-w-0 text-base font-medium"
                  placeholder="Filter…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select className="select select-bordered bg-base-100/80 h-11 px-4 font-bold text-base" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="name">Sort: A → Z</option>
                <option value="name_desc">Sort: Z → A</option>
                <option value="dirty">Sort: Dirty first</option>
                <option value="lang">Sort: Language</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {!scanned ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-base-content/45 space-y-3 max-w-sm">
            <TbLayoutGrid className="text-5xl mx-auto opacity-25" />
            <p className="text-sm">Pick a directory (or a recent path) to list dev projects next to each other.</p>
            <p className="text-[11px] text-base-content/35">Favorites stay on top after scan. Use the filter to jump by name or stack.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* List */}
          <div className="lg:w-[42%] border-b lg:border-b-0 lg:border-r border-base-content/10 overflow-y-auto bg-base-100 p-2 md:p-3 space-y-1 min-h-[40vh] lg:min-h-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center text-sm text-base-content/45 py-16 px-4">
                No projects in this folder. Try another path or check that folders contain package.json, Cargo.toml, go.mod, or Python markers.
              </div>
            ) : filteredSorted.length === 0 ? (
              <div className="text-center text-sm text-base-content/45 py-12">No matches for this filter.</div>
            ) : (
              filteredSorted.map((p) => (
                <div
                  key={p.path}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && (setSelected(p), setScriptOutput(""))}
                  className={`rounded-xl border p-2.5 cursor-pointer transition-all ${
                    selected?.path === p.path
                      ? "border-primary bg-primary/8 shadow-sm shadow-primary/10"
                      : "border-base-content/10 bg-base-200/25 hover:bg-base-200/50 hover:border-base-content/18"
                  }`}
                  onClick={() => {
                    setSelected(p);
                    setScriptOutput("");
                  }}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square min-h-0 h-7 w-7 shrink-0 mt-0.5"
                      title={favorites.has(p.path) ? "Remove favorite" : "Favorite"}
                      onClick={(e) => toggleFavorite(p.path, e)}
                    >
                      {favorites.has(p.path) ? (
                        <TbStarFilled size={16} className="text-warning" />
                      ) : (
                        <TbStar size={16} className="opacity-35 hover:opacity-70" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm truncate leading-tight">{p.name}</h4>
                        <span className={`badge badge-xs shrink-0 border-0 ${langBadgeClass(p.lang)}`}>{p.lang}</span>
                      </div>
                      <p className="text-[10px] font-mono text-base-content/40 truncate mt-0.5" title={p.path}>
                        {p.path}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {p.framework && (
                          <span className="badge badge-xs badge-outline border-base-content/15 opacity-80">{p.framework}</span>
                        )}
                        {p.git_branch && (
                          <span className="text-[10px] font-mono text-base-content/45 flex items-center gap-0.5">
                            <TbGitBranch size={11} /> {p.git_branch}
                          </span>
                        )}
                        {p.git_dirty && p.git_changed_files > 0 && (
                          <span className="badge badge-xs badge-warning/30 text-warning-content border-0">
                            {p.git_changed_files} changed
                          </span>
                        )}
                        {p.git_dirty && p.git_changed_files === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Dirty" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="flex-1 bg-base-200/35 overflow-hidden flex flex-col min-h-0">
            {selected ? (
              <>
                <div className="p-4 md:p-5 border-b border-base-content/10 space-y-3 overflow-y-auto shrink-0 max-h-[55vh] lg:max-h-[50%]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-bold leading-tight">{selected.name}</h3>
                      <p className="text-[11px] font-mono text-base-content/45 mt-1 break-all select-all">{selected.path}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      <button type="button" className="btn btn-xs btn-outline gap-1" onClick={() => copyPath(selected.path)}>
                        <TbCopy size={13} /> Copy
                      </button>
                      <button type="button" className="btn btn-xs btn-outline gap-1" onClick={() => revealFolder(selected.path)}>
                        <TbFolderOpen size={13} /> Folder
                      </button>
                    </div>
                  </div>

                  {readme.length > 0 && (
                    <div className="rounded-xl border border-base-content/10 bg-base-100/50 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-base-content/[0.04]"
                        onClick={() => setReadmeOpen((o) => !o)}
                      >
                        <span className="flex items-center gap-2">
                          <TbBook size={14} className="opacity-60" /> README
                        </span>
                        <TbChevronDown size={16} className={`opacity-50 transition-transform ${readmeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {readmeOpen && (
                        <pre className="px-3 pb-3 pt-0 text-[10px] leading-relaxed text-base-content/75 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto border-t border-base-content/5">
                          {readme}
                        </pre>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/45 mb-1.5">Open in</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "code", label: "VS Code", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" },
                        { id: "antigravity", label: "Antigravity", icon: null as string | null },
                        { id: "opencode", label: "OpenCode", icon: null },
                        { id: "kitty -d", label: "Terminal", icon: null },
                      ].map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          className="btn btn-xs btn-outline border-base-content/15 gap-1"
                          onClick={() => openEditor(selected, e.id)}
                        >
                          {e.icon ? (
                            <img src={e.icon} className="w-3.5 h-3.5 opacity-80" alt="" />
                          ) : (
                            <TbCode className="opacity-70" size={14} />
                          )}
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/45 mb-1.5">Scripts</p>
                    {selected.scripts.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.scripts.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="btn btn-xs btn-primary font-mono gap-1 min-h-0 h-8"
                            disabled={scriptRunning}
                            onClick={() => runScript(selected, s)}
                          >
                            <TbPlayerPlayFilled size={12} /> {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-base-content/40">No npm scripts / default cargo or go commands detected.</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 border-t border-base-content/10 bg-base-300/40">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-base-content/10 bg-base-300/60 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/45">Output</span>
                    <div className="flex items-center gap-1">
                      {scriptRunning && <span className="loading loading-spinner loading-xs text-primary" />}
                      <button type="button" className="btn btn-ghost btn-xs gap-0.5 min-h-0 h-6 px-2" onClick={() => setScriptOutput("")} disabled={!scriptOutput}>
                        <TbTrash size={12} /> Clear
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {scriptOutput.split("\n").map((line, i) => {
                      const err = line.startsWith("[error]") || line.toLowerCase().includes("error:");
                      return (
                        <span key={i} className={err ? "text-error" : "text-base-content/80"}>
                          {line}
                          {"\n"}
                        </span>
                      );
                    })}
                    {!scriptOutput && (
                      <span className="text-base-content/35 italic">Run a script or use Copy / Folder — output shows here.</span>
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-base-content/35 text-sm p-8 text-center">
                Select a project on the left to see actions, README, and script output.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
