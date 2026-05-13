import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import DirInput from "../components/DirInput";
import {
  TbFolder, TbGitBranch, TbPlayerPlayFilled, TbCode,
  TbSearch,
} from "react-icons/tb";

interface Project {
  name: string; path: string; lang: string;
  framework: string; git_branch: string; git_dirty: boolean; scripts: string[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [homeDir, setHomeDir] = useState("~/projects");
  const [selected, setSelected] = useState<Project | null>(null);
  const [scriptOutput, setScriptOutput] = useState("");

  const scan = async (dir: string) => {
    const target = dir.replace(/^~/, "/home/alertxsto");
    setLoading(true);
    setScanned(true);
    setSelected(null);
    setScriptOutput("");
    try {
      const res = await invoke("scan_projects", { dir: target });
      setProjects(res as Project[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const runScript = async (p: Project, script: string) => {
    setScriptOutput(`Running ${script} in ${p.name}...\n`);
    try {
      const out = await invoke("run_project_script", { path: p.path, script, lang: p.lang });
      setScriptOutput((prev) => prev + out);
    } catch (e) {
      setScriptOutput((prev) => prev + `\n[ERROR] ${String(e)}`);
    }
  };

  const openEditor = async (p: Project, editor: string) => {
    try {
      await invoke("open_in_editor", { path: p.path, editor });
    } catch (e) {
      setScriptOutput((prev) => prev + `\n[ERROR opening editor] ${String(e)}`);
    }
  };

  const langColor = (lang: string) => {
    const colors: Record<string, string> = {
      js: "text-yellow-400", ts: "text-blue-400", rs: "text-orange-400",
      go: "text-cyan-400", py: "text-green-400",
    };
    return colors[lang] || "text-base-content/60";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project Control Center</h2>
            <p className="text-sm text-base-content/50 mt-0.5">Manage local repos and run dev scripts</p>
          </div>
          {scanned && (
            <button className="btn btn-sm btn-outline" onClick={() => scan(homeDir)} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : <TbSearch size={14} />}
              Rescan
            </button>
          )}
        </div>
        {!scanned && (
          <div className="mt-4 max-w-xl">
            <DirInput
              label="Scan Directory"
              value={homeDir}
              onChange={setHomeDir}
              placeholder="~/projects"
              onEnter={() => scan(homeDir)}
            />
            <button className="btn btn-primary btn-sm mt-3" onClick={() => scan(homeDir)}>
              <TbSearch size={14} /> Scan
            </button>
          </div>
        )}
      </div>

      {!scanned ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-base-content/40 space-y-2">
            <TbFolder className="text-5xl mx-auto opacity-30" />
            <p>Enter a directory path to scan for projects</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Project List */}
          <div className="w-1/2 border-r border-base-content/10 overflow-y-auto bg-base-100 p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center text-sm text-base-content/40 py-12">No projects found.</div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.path}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    selected?.path === p.path
                      ? "border-primary bg-primary/5 shadow-sm shadow-primary/5"
                      : "border-base-content/10 bg-base-200/30 hover:bg-base-200 hover:border-base-content/20"
                  }`}
                  onClick={() => { setSelected(p); setScriptOutput(""); }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                      <p className="text-[11px] font-mono text-base-content/40 truncate mt-0.5" title={p.path}>{p.path}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold uppercase ${langColor(p.lang)}`}>{p.lang}</span>
                      {p.git_dirty && <span className="w-1.5 h-1.5 rounded-full bg-warning" title="dirty" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {p.framework && (
                      <span className="badge badge-xs badge-ghost text-[10px]">{p.framework}</span>
                    )}
                    {p.git_branch && (
                      <span className="text-[10px] font-mono text-base-content/40 flex items-center gap-1">
                        <TbGitBranch size={10} /> {p.git_branch}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Detail */}
          <div className="w-1/2 bg-base-200/30 overflow-y-auto flex flex-col">
            {selected ? (
              <>
                <div className="p-5 border-b border-base-content/10 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{selected.name}</h3>
                    <p className="text-xs font-mono text-base-content/40 mt-1 select-all">{selected.path}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "code", label: "VS Code", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" },
                      { id: "antigravity", label: "Antigravity", icon: null },
                      { id: "opencode", label: "OpenCode", icon: null },
                      { id: "kitty -d", label: "Terminal", icon: null },
                    ].map((e) => (
                      <button
                        key={e.id}
                        className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-300 hover:text-base-content gap-1.5"
                        onClick={() => openEditor(selected, e.id)}
                      >
                        {e.icon ? (
                          <img src={e.icon} className="w-4 h-4 opacity-70" />
                        ) : (
                          <TbCode className="text-base opacity-70" />
                        )}
                        {e.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2">Runnable Scripts</h4>
                    {selected.scripts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selected.scripts.map((s) => (
                          <button key={s} className="btn btn-sm btn-primary font-mono text-xs gap-1" onClick={() => runScript(selected, s)}>
                            <TbPlayerPlayFilled size={12} /> {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-base-content/40">No standard scripts detected.</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
                  {scriptOutput || <span className="text-base-content/30 italic">Select a script to run and view output here...</span>}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-base-content/30 text-sm">
                Select a project from the left
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
