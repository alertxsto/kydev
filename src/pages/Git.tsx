import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbGitBranch, TbGitCommit, TbArrowUp, TbArrowDown,
  TbRefresh, TbCirclePlus, TbCircleMinus, TbCode,
  TbHistory, TbListTree, TbSquareRoundedArrowUp,
} from "react-icons/tb";

interface GitStatusFile {
  path: string;
  status: string;
  staged: boolean;
}

interface GitLogEntry {
  hash: string;
  author: string;
  message: string;
  date: string;
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  remote: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  M: { label: "Modified", color: "text-warning" },
  A: { label: "Added", color: "text-success" },
  D: { label: "Deleted", color: "text-error" },
  R: { label: "Renamed", color: "text-info" },
  "?": { label: "Untracked", color: "text-base-content/50" },
};

export default function Git() {
  const [repoPath, setRepoPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [statusFiles, setStatusFiles] = useState<GitStatusFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitStatusFile | null>(null);
  const [diffContent, setDiffContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [log, setLog] = useState<GitLogEntry[]>([]);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"diff" | "commit" | "log" | "branches">("diff");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    invoke<string>("load_state_file").then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.recentGitRepos) setRecentRepos(s.recentGitRepos);
      } catch {}
    }).catch(() => {});
  }, []);

  const saveRecentRepos = (repos: string[]) => {
    invoke("save_state_file", { state: JSON.stringify({ recentGitRepos: repos }) }).catch(() => {});
  };

  const loadRepo = async (path: string) => {
    setLoading(true);
    setError("");
    setOutput("");
    setSelectedFile(null);
    setDiffContent("");
    setCommitMsg("");
    setStatusFiles([]);
    setLog([]);
    setBranches([]);
    try {
      const [br, st] = await Promise.all([
        invoke<string>("git_current_branch", { path }),
        invoke<GitStatusFile[]>("git_status", { path }),
      ]);
      setRepoPath(path);
      setBranch(br);
      setStatusFiles(st);
      setInputPath(path);
      const updated = [path, ...recentRepos.filter((r) => r !== path)].slice(0, 8);
      setRecentRepos(updated);
      saveRecentRepos(updated);
    } catch (e) {
      setError(`${e}`);
    }
    setLoading(false);
  };

  const viewDiff = async (file: GitStatusFile) => {
    setSelectedFile(file);
    setActiveTab("diff");
    try {
      const d = await invoke<string>("git_diff", { path: repoPath, file: file.path, staged: file.staged });
      setDiffContent(d || "(no diff content)");
    } catch (e) {
      setDiffContent(`Error: ${e}`);
    }
  };

  const stageFile = async (file: GitStatusFile) => {
    setActionLoading(file.path);
    try {
      await invoke("git_stage", { path: repoPath, files: [file.path] });
      await refreshStatus();
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const unstageFile = async (file: GitStatusFile) => {
    setActionLoading(file.path);
    try {
      await invoke("git_unstage", { path: repoPath, files: [file.path] });
      await refreshStatus();
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const stageAll = async () => {
    setActionLoading("all");
    try {
      await invoke("git_stage", { path: repoPath, files: [] as string[] });
      await refreshStatus();
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const unstageAll = async () => {
    setActionLoading("all");
    try {
      await invoke("git_unstage", { path: repoPath, files: [] as string[] });
      await refreshStatus();
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const commit = async () => {
    if (!commitMsg.trim()) return;
    setActionLoading("commit");
    try {
      const res = await invoke<string>("git_commit", { path: repoPath, message: commitMsg });
      setOutput(res);
      setCommitMsg("");
      await refreshStatus();
      setActiveTab("log");
      await loadLog();
    } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const push = async () => {
    setActionLoading("push");
    try {
      const res = await invoke<string>("git_push", { path: repoPath });
      setOutput(res);
    } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const pull = async () => {
    setActionLoading("pull");
    try {
      const res = await invoke<string>("git_pull", { path: repoPath });
      setOutput(res);
      await refreshStatus();
    } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const loadLog = async () => {
    setActionLoading("log");
    try {
      const res = await invoke<GitLogEntry[]>("git_log", { path: repoPath, limit: 50 });
      setLog(res);
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const loadBranches = async () => {
    setActionLoading("branches");
    try {
      const res = await invoke<GitBranchInfo[]>("git_branches", { path: repoPath });
      setBranches(res);
    } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const checkoutBranch = async (name: string) => {
    setActionLoading(`co:${name}`);
    try {
      const res = await invoke<string>("git_checkout", { path: repoPath, branch: name });
      setOutput(res);
      await refreshStatus();
      if (activeTab === "branches") await loadBranches();
    } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const refreshStatus = async () => {
    try {
      const [br, st] = await Promise.all([
        invoke<string>("git_current_branch", { path: repoPath }),
        invoke<GitStatusFile[]>("git_status", { path: repoPath }),
      ]);
      setBranch(br);
      setStatusFiles(st);
      setSelectedFile(null);
      setDiffContent("");
    } catch (e) { setError(`${e}`); }
  };

  const handleOpen = () => {
    const p = inputPath.trim().replace("~", "/home/alertxsto");
    if (p) loadRepo(p);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleOpen();
  };

  const staged = statusFiles.filter((f) => f.staged);
  const unstaged = statusFiles.filter((f) => !f.staged);

  const renderStatusIcon = (status: string) => {
    const info = STATUS_LABELS[status] || { label: status, color: "text-base-content" };
    return <span className={`${info.color} font-bold text-xs w-5 inline-block`} title={info.label}>{status}</span>;
  };

  const renderFileList = (files: GitStatusFile[], title: string, emptyMsg: string) => (
    <div className="mb-2">
      <div className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold px-2 py-1">{title}</div>
      {files.length === 0 ? (
        <div className="text-[11px] text-base-content/30 px-2 py-1 italic">{emptyMsg}</div>
      ) : (
        files.map((f) => (
          <div
            key={`${f.staged ? "s" : "u"}:${f.path}`}
            className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-xs hover:bg-base-200 transition-colors ${
              selectedFile?.path === f.path && selectedFile?.staged === f.staged ? "bg-primary/10 text-primary" : ""
            }`}
            onClick={() => viewDiff(f)}
          >
            {renderStatusIcon(f.status)}
            <span className="truncate flex-1">{f.path}</span>
            {actionLoading === f.path ? (
              <span className="loading loading-spinner loading-xs" />
            ) : f.staged ? (
              <button
                className="opacity-0 hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); unstageFile(f); }}
                title="Unstage"
              >
                <TbCircleMinus className="text-warning" size={14} />
              </button>
            ) : (
              <button
                className="opacity-0 hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); stageFile(f); }}
                title="Stage"
              >
                <TbCirclePlus className="text-success" size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );

  if (!repoPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-base-content">
        <TbGitBranch size={48} className="text-base-content/20 mb-4" />
        <h2 className="text-lg font-bold mb-2">Git GUI</h2>
        <p className="text-xs text-base-content/50 mb-4">Open a git repository to get started</p>
        <div className="flex gap-2 w-full max-w-md">
          <input
            className="input input-bordered input-sm flex-1 font-mono text-xs"
            placeholder="~/projects/my-project"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary btn-sm" onClick={handleOpen} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "Open"}
          </button>
        </div>
        {recentRepos.length > 0 && (
          <div className="mt-4 w-full max-w-md">
            <div className="text-[10px] uppercase tracking-wider text-base-content/40 font-bold mb-2 px-1">Recent</div>
            <div className="flex flex-col gap-1">
              {recentRepos.map((r) => (
                <button
                  key={r}
                  className="text-left text-xs font-mono px-2 py-1.5 rounded hover:bg-base-200 transition-colors truncate"
                  onClick={() => { setInputPath(r); loadRepo(r); }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <div className="text-xs text-error mt-3">{error}</div>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-base-content/10 bg-base-200 shrink-0">
        <input
          className="input input-ghost input-xs font-mono flex-1 text-xs"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-ghost btn-xs" onClick={handleOpen} title="Open">
          <TbRefresh size={14} />
        </button>
        <div className="flex items-center gap-1 px-2 text-xs font-mono">
          <TbGitBranch className="text-primary" size={14} />
          <span className="text-primary font-semibold">{branch}</span>
        </div>
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={pull}
            disabled={actionLoading === "pull"}
            title="Pull"
          >
            {actionLoading === "pull" ? <span className="loading loading-spinner loading-xs" /> : <TbArrowDown size={14} />}
            <span className="hidden sm:inline">Pull</span>
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={push}
            disabled={actionLoading === "push"}
            title="Push"
          >
            {actionLoading === "push" ? <span className="loading loading-spinner loading-xs" /> : <TbArrowUp size={14} />}
            <span className="hidden sm:inline">Push</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: file list */}
        <div className="w-72 border-r border-base-content/10 overflow-y-auto bg-base-300/50 shrink-0">
          <div className="flex items-center justify-between px-2 py-1 border-b border-base-content/10">
            <span className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold">Changes</span>
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-xs" onClick={stageAll} disabled={actionLoading === "all" || unstaged.length === 0} title="Stage All">
                <TbCirclePlus size={12} className="text-success" />
              </button>
              <button className="btn btn-ghost btn-xs" onClick={unstageAll} disabled={actionLoading === "all" || staged.length === 0} title="Unstage All">
                <TbCircleMinus size={12} className="text-warning" />
              </button>
              <button className="btn btn-ghost btn-xs" onClick={refreshStatus} title="Refresh">
                <TbRefresh size={12} />
              </button>
            </div>
          </div>
          <div className="p-1">
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
            ) : statusFiles.length === 0 ? (
              <div className="text-[11px] text-base-content/30 text-center py-8 italic">Working tree clean</div>
            ) : (
              <>
                {renderFileList(staged, `Staged (${staged.length})`, "No staged files")}
                {staged.length > 0 && unstaged.length > 0 && <div className="border-t border-base-content/10 mx-2 my-1" />}
                {renderFileList(unstaged, `Unstaged (${unstaged.length})`, "No unstaged changes")}
              </>
            )}
          </div>
        </div>

        {/* Right panel: tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-base-content/10 bg-base-200 shrink-0" role="tablist">
            {(["diff", "commit", "log", "branches"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                  activeTab === tab ? "text-primary border-b-2 border-primary bg-base-100" : "text-base-content/50 hover:text-base-content"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "log" && log.length === 0) loadLog();
                  if (tab === "branches" && branches.length === 0) loadBranches();
                }}
              >
                {tab === "diff" && <span className="flex items-center gap-1"><TbCode size={12} />Diff</span>}
                {tab === "commit" && <span className="flex items-center gap-1"><TbGitCommit size={12} />Commit</span>}
                {tab === "log" && <span className="flex items-center gap-1"><TbHistory size={12} />History</span>}
                {tab === "branches" && <span className="flex items-center gap-1"><TbListTree size={12} />Branches</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Diff Tab */}
            {activeTab === "diff" && (
              <div>
                {selectedFile ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStatusIcon(selectedFile.status)}
                      <span className="text-xs font-mono">{selectedFile.path}</span>
                      <span className="text-[10px] text-base-content/50">{selectedFile.staged ? "(staged)" : "(unstaged)"}</span>
                    </div>
                    <pre className="text-[11px] font-mono bg-base-300 rounded p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {diffContent || <span className="text-base-content/30 italic">Loading diff...</span>}
                    </pre>
                  </>
                ) : (
                  <div className="text-xs text-base-content/30 text-center py-12 italic">
                    Select a file from the change list to view diff
                  </div>
                )}
              </div>
            )}

            {/* Commit Tab */}
            {activeTab === "commit" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1">
                  {staged.map((f) => (
                    <span key={f.path} className="badge badge-outline badge-xs gap-1">
                      {renderStatusIcon(f.status)}
                      <span className="max-w-[120px] truncate">{f.path}</span>
                    </span>
                  ))}
                </div>
                {staged.length === 0 ? (
                  <div className="text-xs text-base-content/30 text-center py-8 italic">
                    Stage some files first to create a commit
                  </div>
                ) : (
                  <>
                    <textarea
                      className="textarea textarea-bordered text-xs font-mono h-20"
                      placeholder="Commit message..."
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={commit}
                        disabled={actionLoading === "commit" || !commitMsg.trim()}
                      >
                        {actionLoading === "commit" ? <span className="loading loading-spinner loading-xs" /> : <TbGitCommit size={14} />}
                        Commit {staged.length > 0 ? `(${staged.length} file${staged.length > 1 ? "s" : ""})` : ""}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setCommitMsg("")}>Clear</button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-base-content/50 mt-1">
                      <TbSquareRoundedArrowUp size={12} />
                      <span>{branch}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Log Tab */}
            {activeTab === "log" && (
              <div>
                {actionLoading === "log" ? (
                  <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
                ) : log.length === 0 ? (
                  <div className="text-xs text-base-content/30 text-center py-8 italic">No commits yet</div>
                ) : (
                  <div className="space-y-1">
                    {log.map((entry) => (
                      <div key={entry.hash} className="flex items-start gap-2 p-2 rounded hover:bg-base-200 transition-colors">
                        <span className="font-mono text-[10px] text-primary font-bold shrink-0 mt-0.5">{entry.hash}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{entry.message}</div>
                          <div className="text-[10px] text-base-content/40">
                            {entry.author} &middot; {entry.date}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-ghost btn-xs mt-2" onClick={loadLog} disabled={actionLoading === "log"}>
                  <TbRefresh size={12} /> Refresh
                </button>
              </div>
            )}

            {/* Branches Tab */}
            {activeTab === "branches" && (
              <div>
                {actionLoading === "branches" ? (
                  <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
                ) : (
                  <div className="space-y-1">
                    {branches.map((b) => (
                      <div
                        key={b.name}
                        className={`flex items-center gap-2 p-2 rounded text-xs ${
                          b.current ? "bg-primary/10 text-primary" : "hover:bg-base-200"
                        }`}
                      >
                        <TbGitBranch size={14} className={b.current ? "text-primary" : "text-base-content/30"} />
                        <span className="flex-1 font-mono">{b.name}</span>
                        {b.current ? (
                          <span className="badge badge-primary badge-xs">current</span>
                        ) : (
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => checkoutBranch(b.name)}
                            disabled={actionLoading === `co:${b.name}`}
                          >
                            {actionLoading === `co:${b.name}` ? <span className="loading loading-spinner loading-xs" /> : "Checkout"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-ghost btn-xs mt-2" onClick={loadBranches} disabled={actionLoading === "branches"}>
                  <TbRefresh size={12} /> Refresh
                </button>
              </div>
            )}

            {/* Output display */}
            {output && (
              <div className="mt-3 border-t border-base-content/10 pt-3">
                <pre className="text-[11px] font-mono bg-base-300 rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">
                  {output}
                </pre>
              </div>
            )}
            {error && (
              <div className="mt-2 text-xs text-error">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
