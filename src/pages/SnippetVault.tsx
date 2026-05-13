import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbTerminal2, TbPlus, TbTrash, TbCopy, TbPlayerPlay,
  TbSearch, TbTag, TbDeviceFloppy, TbX, TbCheck,
} from "react-icons/tb";

interface Snippet { id: string; title: string; command: string; tags: string[]; }

export default function SnippetVault() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selected, setSelected] = useState<Snippet | null>(null);
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Snippet>({ id: "", title: "", command: "", tags: [] });
  const [tagInput, setTagInput] = useState("");

  const load = async () => {
    try { setSnippets(await invoke("get_snippets") as Snippet[]); } catch {}
  };

  const save = async (list: Snippet[]) => {
    try { await invoke("save_snippets", { snippets: list }); } catch {}
  };

  useEffect(() => { load(); }, []);

  const filtered = snippets.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.command.toLowerCase().includes(query.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const runSnippet = async (cmd: string) => {
    setRunning(true); setOutput("");
    try {
      const out = await invoke("run_snippet", { command: cmd }) as string;
      setOutput(out || "(no output)");
    } catch (e) { setOutput(`[ERROR] ${String(e)}`); }
    setRunning(false);
  };

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startNew = () => {
    setForm({ id: crypto.randomUUID(), title: "", command: "", tags: [] });
    setEditing(true);
    setSelected(null);
  };

  const startEdit = (s: Snippet) => {
    setForm({ ...s });
    setEditing(true);
  };

  const saveSnippet = async () => {
    if (!form.title.trim() || !form.command.trim()) return;
    const exists = snippets.findIndex(s => s.id === form.id);
    const next = exists >= 0
      ? snippets.map(s => s.id === form.id ? form : s)
      : [...snippets, form];
    setSnippets(next);
    await save(next);
    setEditing(false);
    setSelected(form);
  };

  const deleteSnippet = async (id: string) => {
    const next = snippets.filter(s => s.id !== id);
    setSnippets(next);
    await save(next);
    if (selected?.id === id) { setSelected(null); setOutput(""); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbTerminal2 size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Snippet Vault</h2>
              <p className="text-sm text-base-content/50 mt-0.5">Your personal command library</p>
            </div>
          </div>
          <button className="btn btn-primary btn-sm gap-1.5" onClick={startNew}>
            <TbPlus size={14} /> New Snippet
          </button>
        </div>
        <div className="relative">
          <TbSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input type="text" className="input input-bordered input-sm w-full pl-8 text-sm" placeholder="Search snippets..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Snippet list */}
        <div className="w-72 border-r border-base-content/10 flex flex-col bg-base-100 shrink-0">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-base-content/40">
                <TbTerminal2 size={36} className="mx-auto opacity-20 mb-2" />
                <p className="text-xs">{query ? "No results" : "No snippets yet"}</p>
                {!query && <button className="btn btn-xs btn-outline mt-3 gap-1" onClick={startNew}><TbPlus size={12} /> Add First</button>}
              </div>
            ) : filtered.map(s => (
              <button
                key={s.id}
                className={`w-full text-left rounded-xl p-3 transition-all group ${selected?.id === s.id && !editing ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
                onClick={() => { setSelected(s); setEditing(false); setOutput(""); }}
              >
                <p className={`font-semibold text-sm truncate`}>{s.title}</p>
                <p className={`text-[10px] font-mono truncate mt-0.5 ${selected?.id === s.id && !editing ? "opacity-70" : "text-base-content/40"}`}>{s.command}</p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.tags.map(t => <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full ${selected?.id === s.id && !editing ? "bg-white/20" : "bg-base-300 text-base-content/50"}`}>{t}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col">
          {editing ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-2xl">
              <h3 className="font-bold text-lg">{form.id && snippets.find(s => s.id === form.id) ? "Edit" : "New"} Snippet</h3>
              <div>
                <label className="text-xs font-semibold mb-1 block">Title</label>
                <input className="input input-bordered w-full text-sm" placeholder="e.g. Kill port 3000" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Command</label>
                <textarea className="textarea textarea-bordered w-full font-mono text-sm min-h-[120px]" placeholder="e.g. fuser -k 3000/tcp" value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Tags</label>
                <div className="flex gap-2">
                  <input className="input input-bordered input-sm flex-1 text-xs" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} />
                  <button className="btn btn-sm btn-outline gap-1" onClick={addTag}><TbTag size={12} /> Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="badge badge-outline gap-1 text-xs">
                      {t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><TbX size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary gap-1.5" onClick={saveSnippet}><TbDeviceFloppy size={14} /> Save</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-base-content/10 bg-base-200/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{selected.title}</h3>
                  {selected.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">{selected.tags.map(t => <span key={t} className="badge badge-xs badge-ghost">{t}</span>)}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-outline gap-1" onClick={() => copyCmd(selected.command)}>
                    {copied ? <TbCheck size={13} className="text-success" /> : <TbCopy size={13} />} Copy
                  </button>
                  <button className="btn btn-sm btn-primary gap-1" onClick={() => runSnippet(selected.command)} disabled={running}>
                    {running ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerPlay size={13} />} Run
                  </button>
                  <button className="btn btn-sm btn-ghost gap-1" onClick={() => startEdit(selected)}><TbDeviceFloppy size={13} /> Edit</button>
                  <button className="btn btn-sm btn-ghost text-error gap-1" onClick={() => deleteSnippet(selected.id)}><TbTrash size={13} /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="rounded-xl bg-base-300 border border-base-content/10 p-4 font-mono text-sm text-base-content/80 whitespace-pre-wrap">{selected.command}</div>
              </div>
              {output && (
                <div className="flex-1 flex flex-col mx-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TbTerminal2 size={14} className="opacity-50" />
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-50">Output</span>
                  </div>
                  <div className="flex-1 rounded-xl bg-base-300 border border-base-content/10 p-4 font-mono text-xs text-base-content/70 overflow-y-auto whitespace-pre-wrap">{output}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-base-content/30">
              <div className="text-center">
                <TbTerminal2 size={48} className="mx-auto opacity-20 mb-3" />
                <p className="text-sm">Select a snippet or create one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
