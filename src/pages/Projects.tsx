import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbFolder, TbGitBranch, TbPlayerPlayFilled, TbCode } from "react-icons/tb";

interface Project {
  name: string;
  path: string;
  lang: string;
  framework: string;
  git_branch: string;
  git_dirty: boolean;
  scripts: string[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [homeDir, setHomeDir] = useState("~/projects");
  const [selected, setSelected] = useState<Project | null>(null);
  const [scriptOutput, setScriptOutput] = useState("");

  const scan = async (dir: string) => {
    let target = dir.replace("~", "/home/alertxsto");
    setLoading(true);
    setScanned(true);
    setSelected(null);
    setScriptOutput("");
    try {
      const res = await invoke("scan_projects", { dir: target });
      setProjects(res as Project[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const runScript = async (p: Project, script: string) => {
    setScriptOutput(`Running ${script} in ${p.name}...\n`);
    const out = await invoke("run_project_script", { path: p.path, script, lang: p.lang });
    setScriptOutput((prev) => prev + out);
  };

  const openEditor = async (p: Project, editor: string) => {
    await invoke("open_in_editor", { path: p.path, editor });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold">Project Control Center</h2>
          <p className="text-xs text-base-content/50">Manage local repos and run dev scripts</p>
        </div>
        {!scanned ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm font-mono text-xs w-64"
              value={homeDir}
              onChange={(e) => setHomeDir(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scan(homeDir)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => scan(homeDir)}>Scan</button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => scan(homeDir)}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "Rescan"}
          </button>
        )}
      </div>

      {!scanned ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-base-content/40">
            <TbFolder className="text-4xl mb-2 mx-auto" />
            <p>Enter a directory path to scan for projects</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Project List */}
          <div className="w-1/2 border-r border-base-content/10 overflow-y-auto bg-base-100">
            {loading ? (
              <div className="p-8 text-center"><span className="loading loading-spinner text-primary" /></div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-sm text-base-content/50">No projects found.</div>
            ) : (
              <table className="table table-sm table-zebra w-full">
                <thead className="bg-base-200 sticky top-0 z-10 text-xs">
                  <tr>
                    <th>Project</th>
                    <th>Stack</th>
                    <th>Git</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr 
                      key={p.path} 
                      className={`cursor-pointer hover:bg-base-200/50 transition-colors ${selected?.path === p.path ? "bg-primary/10" : ""}`}
                      onClick={() => { setSelected(p); setScriptOutput(""); }}
                    >
                      <td className="font-semibold text-sm max-w-[150px] truncate" title={p.name}>{p.name}</td>
                      <td>
                        <span className="badge badge-sm badge-outline text-[10px]">{p.framework || p.lang}</span>
                      </td>
                      <td className="text-xs font-mono flex items-center gap-1">
                        {p.git_branch ? (
                          <>
                            <span className="opacity-70 flex items-center gap-1"><TbGitBranch /> {p.git_branch}</span>
                            {p.git_dirty && <span className="text-warning text-[10px]">●</span>}
                          </>
                        ) : <span className="opacity-30">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Pane: Project Details & Actions */}
          <div className="w-1/2 bg-base-200/30 overflow-y-auto flex flex-col">
            {selected ? (
              <>
                <div className="p-6 border-b border-base-content/10">
                  <h3 className="text-2xl font-bold">{selected.name}</h3>
                  <p className="text-xs font-mono text-base-content/50 mt-1 mb-4 select-all">{selected.path}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-300 hover:text-base-content" onClick={() => openEditor(selected, "code")}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" className="w-4 h-4 opacity-70" /> VS Code
                    </button>
                    <button className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-300 hover:text-base-content" onClick={() => openEditor(selected, "antigravity")}>
                      <TbCode className="text-lg opacity-70" /> Antigravity
                    </button>
                    <button className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-300 hover:text-base-content" onClick={() => openEditor(selected, "opencode")}>
                      <TbCode className="text-lg opacity-70" /> OpenCode
                    </button>
                    <button className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-300 hover:text-base-content font-mono" onClick={() => openEditor(selected, "kitty -d")}>
                      {">_"} Terminal
                    </button>
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">Runnable Scripts</h4>
                  {selected.scripts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.scripts.map((s) => (
                        <button key={s} className="btn btn-sm btn-primary font-mono text-xs" onClick={() => runScript(selected, s)}>
                          <TbPlayerPlayFilled className="inline-block mr-1" /> {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-base-content/40">No standard scripts detected.</p>
                  )}
                </div>
                
                {/* Terminal Output */}
                <div className="flex-1 p-4 bg-base-300 font-mono text-[11px] leading-tight text-base-content/70 overflow-y-auto whitespace-pre-wrap">
                  {scriptOutput || "Select a script to run and view output here..."}
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
