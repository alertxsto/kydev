import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DirInput from "../components/DirInput";
import {
  TbGitBranch, TbGitCommit, TbArrowUpToArc, TbArrowDownToArc,
  TbRefresh, TbCirclePlus, TbCircleMinus, TbCode,
  TbHistory, TbListTree, TbFolderOpen, TbX,
} from "react-icons/tb";

interface GitStatusFile { path: string; status: string; staged: boolean; }
interface GitLogEntry { hash: string; author: string; message: string; date: string; }
interface GitBranchInfo { name: string; current: boolean; remote: string; }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  M: { label: "Modified", color: "text-warning", bg: "bg-warning/10" },
  A: { label: "Added", color: "text-success", bg: "bg-success/10" },
  D: { label: "Deleted", color: "text-error", bg: "bg-error/10" },
  R: { label: "Renamed", color: "text-info", bg: "bg-info/10" },
  "?": { label: "Untracked", color: "text-base-content/50", bg: "bg-base-300/30" },
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
      try { const s = JSON.parse(raw); if (s.recentGitRepos) setRecentRepos(s.recentGitRepos); } catch {}
    }).catch(() => {});
  }, []);

  const saveRecentRepos = (repos: string[]) => {
    invoke("save_state_file", { state: JSON.stringify({ recentGitRepos: repos }) }).catch(() => {});
  };

  const loadRepo = async (path: string) => {
    setLoading(true); setError(""); setOutput(""); setSelectedFile(null);
    setDiffContent(""); setCommitMsg(""); setStatusFiles([]); setLog([]); setBranches([]);
    try {
      const [br, st] = await Promise.all([
        invoke<string>("git_current_branch", { path }),
        invoke<GitStatusFile[]>("git_status", { path }),
      ]);
      setRepoPath(path); setBranch(br); setStatusFiles(st); setInputPath(path);
      const updated = [path, ...recentRepos.filter((r) => r !== path)].slice(0, 8);
      setRecentRepos(updated); saveRecentRepos(updated);
    } catch (e) { setError(`${e}`); }
    setLoading(false);
  };

  const viewDiff = async (file: GitStatusFile) => {
    setSelectedFile(file); setActiveTab("diff");
    try {
      const d = await invoke<string>("git_diff", { path: repoPath, file: file.path, staged: file.staged });
      setDiffContent(d || "(no diff content)");
    } catch (e) { setDiffContent(`Error: ${e}`); }
  };

  const stageFile = async (file: GitStatusFile) => {
    setActionLoading(file.path);
    try { await invoke("git_stage", { path: repoPath, files: [file.path] }); await refreshStatus(); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const unstageFile = async (file: GitStatusFile) => {
    setActionLoading(file.path);
    try { await invoke("git_unstage", { path: repoPath, files: [file.path] }); await refreshStatus(); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const stageAll = async () => {
    setActionLoading("all");
    try { await invoke("git_stage", { path: repoPath, files: [] as string[] }); await refreshStatus(); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const unstageAll = async () => {
    setActionLoading("all");
    try { await invoke("git_unstage", { path: repoPath, files: [] as string[] }); await refreshStatus(); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const commit = async () => {
    if (!commitMsg.trim()) return;
    setActionLoading("commit");
    try {
      const res = await invoke<string>("git_commit", { path: repoPath, message: commitMsg });
      setOutput(res); setCommitMsg(""); await refreshStatus(); setActiveTab("log"); await loadLog();
    } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const push = async () => {
    setActionLoading("push");
    try { const res = await invoke<string>("git_push", { path: repoPath }); setOutput(res); } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const pull = async () => {
    setActionLoading("pull");
    try { const res = await invoke<string>("git_pull", { path: repoPath }); setOutput(res); await refreshStatus(); } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const loadLog = async () => {
    setActionLoading("log");
    try { const res = await invoke<GitLogEntry[]>("git_log", { path: repoPath, limit: 50 }); setLog(res); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const loadBranches = async () => {
    setActionLoading("branches");
    try { const res = await invoke<GitBranchInfo[]>("git_branches", { path: repoPath }); setBranches(res); } catch (e) { setError(`${e}`); }
    setActionLoading(null);
  };

  const checkoutBranch = async (name: string) => {
    setActionLoading(`co:${name}`);
    try { const res = await invoke<string>("git_checkout", { path: repoPath, branch: name }); setOutput(res); await refreshStatus(); if (activeTab === "branches") await loadBranches(); } catch (e) { setOutput(`${e}`); }
    setActionLoading(null);
  };

  const refreshStatus = async () => {
    try {
      const [br, st] = await Promise.all([
        invoke<string>("git_current_branch", { path: repoPath }),
        invoke<GitStatusFile[]>("git_status", { path: repoPath }),
      ]);
      setBranch(br); setStatusFiles(st); setSelectedFile(null); setDiffContent("");
    } catch (e) { setError(`${e}`); }
  };

  const handleOpen = () => {
    const p = inputPath.trim().replace(/^~/, "/home/alertxsto");
    if (p) loadRepo(p);
  };

  const staged = statusFiles.filter((f) => f.staged);
  const unstaged = statusFiles.filter((f) => !f.staged);

  const StatusBadge = ({ status }: { status: string }) => {
    const m = STATUS_META[status] || { label: status, color: "text-base-content", bg: "bg-base-300/30" };
    return <span className={`${m.bg} ${m.color} text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0`}>{status}</span>;
  };

  if (!repoPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-base-content">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary mb-4">
          <TbGitBranch size={40} />
        </div>
        <h2 className="text-xl font-bold">Git GUI</h2>
        <p className="text-sm text-base-content/50 mb-6">Open a git repository to get started</p>
        <div className="w-full max-w-md space-y-3">
          <DirInput value={inputPath} onChange={setInputPath} placeholder="~/projects/my-project" onEnter={handleOpen} />
          <button className="btn btn-primary w-full gap-1.5" onClick={handleOpen} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : <TbFolderOpen size={16} />}
            Open Repository
          </button>
        </div>
        {recentRepos.length > 0 && (
          <div className="mt-6 w-full max-w-md">
            <p className="text-[10px] uppercase tracking-wider text-base-content/40 font-bold mb-2">Recent Repositories</p>
            <div className="space-y-1.5">
              {recentRepos.map((r) => (
                <button
                  key={r}
                  className="w-full text-left text-xs font-mono px-3 py-2.5 rounded-2xl bg-base-200/70 border border-base-300/40 hover:border-primary/30 hover:bg-base-200 transition-all truncate flex items-center gap-2"
                  onClick={() => { setInputPath(r); loadRepo(r); }}
                >
                  <TbFolderOpen size={14} className="text-primary shrink-0" />
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <div className="text-xs text-error mt-3 bg-error/10 px-3 py-2 rounded-xl">{error}</div>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-base-content/10 bg-base-200/70 shrink-0">
        <TbFolderOpen size={14} className="text-base-content/40 shrink-0" />
        <input
          className="input input-ghost input-xs font-mono flex-1 text-xs bg-transparent"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
          <TbGitBranch size={12} className="text-primary" />
          <span className="text-[11px] font-semibold text-primary">{branch}</span>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-xs btn-square" onClick={pull} disabled={actionLoading === "pull"} title="Pull">
            {actionLoading === "pull" ? <span className="loading loading-spinner loading-xs" /> : <TbArrowDownToArc size={14} />}
          </button>
          <button className="btn btn-ghost btn-xs btn-square" onClick={push} disabled={actionLoading === "push"} title="Push">
            {actionLoading === "push" ? <span className="loading loading-spinner loading-xs" /> : <TbArrowUpToArc size={14} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File List */}
        <div className="w-72 border-r border-base-content/10 overflow-y-auto bg-base-300/20 shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-base-content/10">
            <span className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold">Changes</span>
            <div className="flex gap-0.5">
              <button className="btn btn-ghost btn-xs btn-square" onClick={refreshStatus} title="Refresh">
                <TbRefresh size={12} />
              </button>
            </div>
          </div>
          <div className="p-2 space-y-3">
            {/* Quick actions */}
            {(staged.length > 0 || unstaged.length > 0) && (
              <div className="flex gap-1 px-1">
                <button className="btn btn-ghost btn-xs gap-1 text-success" onClick={stageAll} disabled={actionLoading === "all" || unstaged.length === 0}>
                  {actionLoading === "all" ? <span className="loading loading-spinner loading-xs" /> : <TbCirclePlus size={12} />}
                  Stage All
                </button>
                <button className="btn btn-ghost btn-xs gap-1 text-warning" onClick={unstageAll} disabled={actionLoading === "all" || staged.length === 0}>
                  <TbCircleMinus size={12} />
                  Unstage All
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
            ) : statusFiles.length === 0 ? (
              <div className="text-[11px] text-base-content/30 text-center py-8 italic">Working tree clean</div>
            ) : (
              <>
                {/* Staged Section */}
                <div className="rounded-xl border border-success/20 bg-success/5 overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-success/10 border-b border-success/20">
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Staged ({staged.length})</span>
                  </div>
                  <div className="divide-y divide-base-content/5">
                    {staged.length === 0 ? (
                      <div className="text-[11px] text-base-content/30 px-2.5 py-2 italic">No staged files</div>
                    ) : staged.map((f) => (
                      <div
                        key={`s:${f.path}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-xs hover:bg-base-200/50 transition-colors ${
                          selectedFile?.path === f.path && selectedFile?.staged ? "bg-primary/5" : ""
                        }`}
                        onClick={() => viewDiff(f)}
                      >
                        <StatusBadge status={f.status} />
                        <span className="truncate flex-1">{f.path}</span>
                        {actionLoading === f.path ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); unstageFile(f); }} title="Unstage" className="opacity-0 group-hover:opacity-100 hover:opacity-100">
                            <TbCircleMinus size={12} className="text-warning" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unstaged Section */}
                <div className="rounded-xl border border-base-300/30 bg-base-200/40 overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-base-200/70 border-b border-base-300/30">
                    <span className="text-[10px] font-bold text-base-content/60 uppercase tracking-wider">Unstaged ({unstaged.length})</span>
                  </div>
                  <div className="divide-y divide-base-content/5">
                    {unstaged.length === 0 ? (
                      <div className="text-[11px] text-base-content/30 px-2.5 py-2 italic">No unstaged changes</div>
                    ) : unstaged.map((f) => (
                      <div
                        key={`u:${f.path}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-xs hover:bg-base-200/50 transition-colors ${
                          selectedFile?.path === f.path && !selectedFile?.staged ? "bg-primary/5" : ""
                        }`}
                        onClick={() => viewDiff(f)}
                      >
                        <StatusBadge status={f.status} />
                        <span className="truncate flex-1">{f.path}</span>
                        {actionLoading === f.path ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); stageFile(f); }} title="Stage" className="opacity-0 hover:opacity-100">
                            <TbCirclePlus size={12} className="text-success" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-base-content/10 bg-base-200/40 shrink-0" role="tablist">
            {(["diff", "commit", "log", "branches"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                className={`px-3 py-2 text-[11px] uppercase tracking-wider font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab ? "text-primary border-b-2 border-primary bg-base-100" : "text-base-content/50 hover:text-base-content hover:bg-base-200/50"
                }`}
                onClick={() => { setActiveTab(tab); if (tab === "log" && log.length === 0) loadLog(); if (tab === "branches" && branches.length === 0) loadBranches(); }}
              >
                {tab === "diff" && <TbCode size={12} />}
                {tab === "commit" && <TbGitCommit size={12} />}
                {tab === "log" && <TbHistory size={12} />}
                {tab === "branches" && <TbListTree size={12} />}
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* ── Diff Tab ── */}
            {activeTab === "diff" && (
              <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-base-content/10 bg-base-200/50">
                      <StatusBadge status={selectedFile.status} />
                      <span className="text-xs font-mono font-medium">{selectedFile.path}</span>
                      <span className="text-[10px] text-base-content/40">{selectedFile.staged ? "(staged)" : "(unstaged)"}</span>
                    </div>
                    <pre className="text-[11px] font-mono p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-[calc(100vh-18rem)] overflow-y-auto">
                      {diffContent || <span className="text-base-content/30 italic">Loading diff...</span>}
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <TbCode size={32} className="text-base-content/20 mx-auto mb-2" />
                      <p className="text-xs text-base-content/30 italic">Select a file to view its diff</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Commit Tab ── */}
            {activeTab === "commit" && (
              <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
                <div className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TbGitCommit size={16} className="text-primary" />
                    New Commit
                  </h4>
                  {staged.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {staged.map((f) => (
                        <span key={f.path} className="badge badge-outline badge-xs gap-1 py-2">
                          <StatusBadge status={f.status} />
                          <span className="max-w-[140px] truncate">{f.path}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-base-content/30 italic py-2">Stage some files first to create a commit</div>
                  )}
                  <textarea
                    className="textarea textarea-bordered text-xs font-mono h-28 w-full bg-base-300/50 border-base-content/20 focus:border-primary/50 rounded-xl"
                    placeholder="Commit message..."
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <button className="btn btn-sm btn-primary gap-1.5" onClick={commit} disabled={actionLoading === "commit" || !commitMsg.trim() || staged.length === 0}>
                      {actionLoading === "commit" ? <span className="loading loading-spinner loading-xs" /> : <TbGitCommit size={14} />}
                      Commit{staged.length > 0 ? ` (${staged.length} file${staged.length > 1 ? "s" : ""})` : ""}
                    </button>
                    <button className="btn btn-sm btn-ghost text-base-content/50" onClick={() => setCommitMsg("")}>Clear</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === "log" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TbHistory size={16} className="text-primary" />
                    Commit History
                  </h4>
                  <button className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content" onClick={loadLog} disabled={actionLoading === "log"}>
                    {actionLoading === "log" ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={12} />}
                    Refresh
                  </button>
                </div>
                {actionLoading === "log" ? (
                  <div className="flex justify-center py-12"><span className="loading loading-spinner loading-sm" /></div>
                ) : log.length === 0 ? (
                  <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 p-8 text-center text-xs text-base-content/30 italic">No commits yet</div>
                ) : (
                  <div className="space-y-1.5">
                    {log.map((entry) => (
                      <div key={entry.hash} className="relative rounded-2xl border border-base-300/40 bg-base-200/70 p-3.5 flex items-start gap-3 hover:border-primary/20 transition-all">
                        <span className="font-mono text-[10px] text-primary font-bold shrink-0 mt-0.5 bg-primary/10 px-1.5 py-0.5 rounded">{entry.hash}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{entry.message}</div>
                          <div className="text-[10px] text-base-content/40 mt-0.5 flex items-center gap-2">
                            <span>{entry.author}</span>
                            <span className="text-base-content/20">·</span>
                            <span>{entry.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Branches Tab ── */}
            {activeTab === "branches" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TbListTree size={16} className="text-primary" />
                    Branches
                  </h4>
                  <button className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content" onClick={loadBranches} disabled={actionLoading === "branches"}>
                    {actionLoading === "branches" ? <span className="loading loading-spinner loading-xs" /> : <TbRefresh size={12} />}
                    Refresh
                  </button>
                </div>
                {actionLoading === "branches" ? (
                  <div className="flex justify-center py-12"><span className="loading loading-spinner loading-sm" /></div>
                ) : (
                  <div className="space-y-1.5">
                    {branches.map((b) => (
                      <div
                        key={b.name}
                        className={`relative rounded-2xl border flex items-center gap-3 p-3.5 text-xs transition-all ${
                          b.current
                            ? "border-primary/30 bg-primary/5"
                            : "border-base-300/40 bg-base-200/70 hover:border-base-content/20"
                        }`}
                      >
                        <TbGitBranch size={16} className={b.current ? "text-primary" : "text-base-content/30"} />
                        <span className="flex-1 font-mono font-medium">{b.name}</span>
                        {b.current ? (
                          <span className="badge badge-primary badge-xs py-1.5">current</span>
                        ) : (
                          <button
                            className="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
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
              </div>
            )}

            {/* Output / Error */}
            {output && (
              <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-base-content/10">
                  <span className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wider">Output</span>
                  <button onClick={() => setOutput("")} className="btn btn-ghost btn-xs btn-square text-base-content/30">
                    <TbX size={12} />
                  </button>
                </div>
                <pre className="text-[11px] font-mono p-3 overflow-x-auto max-h-32 whitespace-pre-wrap text-base-content/60">{output}</pre>
              </div>
            )}
            {error && (
              <div className="relative rounded-2xl border border-error/30 bg-error/5 p-3 text-xs text-error">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
