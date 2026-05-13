import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  TbLock, TbRefresh, TbPlus, TbTrash, TbDeviceFloppy,
  TbEye, TbEyeOff, TbFolderOpen, TbFile,
} from "react-icons/tb";

interface EnvVar { key: string; value: string; }

export default function EnvStudio() {
  const [envFiles, setEnvFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masked, setMasked] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [rootDir, setRootDir] = useState("~/projects");

  const scanForEnvFiles = async (root?: string) => {
    const realRoot = (root ?? rootDir).replace(/^~/, "/home/alertxsto");
    setLoading(true);
    try {
      const files = await invoke("find_env_files", { root: realRoot }) as string[];
      setEnvFiles(files);
      if (files.length > 0) loadFile(files[0]);
    } catch (e) { showToast(String(e), false); }
    setLoading(false);
  };

  const pickDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setRootDir(selected);
        scanForEnvFiles(selected);
      }
    } catch (e) { console.error(e); }
  };

  const loadFile = async (path: string) => {
    setSelectedFile(path);
    setMasked({});
    setLoading(true);
    try {
      const v = await invoke("read_env_file", { path }) as EnvVar[];
      setVars(v);
    } catch (e) { showToast(`Error reading: ${String(e)}`, false); setVars([]); }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await invoke("write_env_file", { path: selectedFile, vars });
      showToast("Saved successfully!", true);
    } catch (e) { showToast(`Save failed: ${String(e)}`, false); }
    setSaving(false);
  };

  const addVar = () => setVars(prev => [...prev, { key: "", value: "" }]);
  const removeVar = (i: number) => setVars(prev => prev.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: "key" | "value", val: string) =>
    setVars(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const baseName = (path: string) => path.split("/").pop() ?? path;
  const dirName = (path: string) => {
    const parts = path.split("/");
    return parts.slice(-3, -1).join("/");
  };

  const isSensitive = (key: string) =>
    /secret|password|token|key|pass|api|auth|private|credential/i.test(key);

  useEffect(() => { scanForEnvFiles(); }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbLock size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Env Studio</h2>
              <p className="text-sm text-base-content/50 mt-0.5">Visual <code className="text-primary">.env</code> editor for all your projects</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-outline gap-1" onClick={pickDir}>
              <TbFolderOpen size={14} /> Open Folder
            </button>
            <button className="btn btn-sm btn-outline gap-1" onClick={() => scanForEnvFiles()} disabled={loading}>
              <TbRefresh className={loading ? "animate-spin" : ""} size={14} /> Scan
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File list */}
        <div className="w-64 border-r border-base-content/10 flex flex-col bg-base-100 shrink-0">
          <div className="p-3 border-b border-base-content/10 bg-base-200/30">
            <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">.env Files ({envFiles.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading && envFiles.length === 0 ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary" /></div>
            ) : envFiles.length === 0 ? (
              <div className="text-center py-8 text-base-content/40">
                <TbFile size={32} className="mx-auto opacity-20 mb-2" />
                <p className="text-xs">No .env files found</p>
                <p className="text-[10px] mt-1 opacity-70">Click "Open Folder" to scan a directory</p>
              </div>
            ) : (
              envFiles.map((f) => (
                <button
                  key={f}
                  className={`w-full text-left rounded-xl p-3 transition-all ${selectedFile === f ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
                  onClick={() => loadFile(f)}
                >
                  <p className="font-mono text-xs font-bold truncate">{baseName(f)}</p>
                  <p className={`text-[10px] truncate mt-0.5 ${selectedFile === f ? "opacity-70" : "text-base-content/50"}`}>{dirName(f)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              <div className="p-3 border-b border-base-content/10 bg-base-200/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <TbLock size={14} className="opacity-40" />
                  <span className="text-xs font-mono text-base-content/70">{selectedFile}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-xs btn-outline gap-1" onClick={addVar}>
                    <TbPlus size={12} /> Add Variable
                  </button>
                  <button className="btn btn-xs btn-primary gap-1" onClick={saveFile} disabled={saving}>
                    {saving ? <span className="loading loading-spinner loading-xs" /> : <TbDeviceFloppy size={12} />} Save
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
                ) : vars.length === 0 ? (
                  <div className="text-center py-12 text-base-content/40">
                    <p className="text-sm">This .env file is empty</p>
                    <button className="btn btn-xs btn-outline mt-3 gap-1" onClick={addVar}><TbPlus size={12} /> Add First Variable</button>
                  </div>
                ) : (
                  vars.map((v, i) => {
                    const sensitive = isSensitive(v.key);
                    const isHidden = masked[i] ?? sensitive;
                    return (
                      <div key={i} className="flex gap-2 items-center group">
                        <input
                          type="text"
                          className="input input-bordered input-sm font-mono text-xs w-48 shrink-0"
                          placeholder="KEY"
                          value={v.key}
                          onChange={(e) => updateVar(i, "key", e.target.value)}
                        />
                        <span className="text-base-content/30 text-sm">=</span>
                        <div className="relative flex-1">
                          <input
                            type={isHidden ? "password" : "text"}
                            className={`input input-bordered input-sm font-mono text-xs w-full pr-8 ${sensitive ? "border-warning/30 bg-warning/5" : ""}`}
                            placeholder="value"
                            value={v.value}
                            onChange={(e) => updateVar(i, "value", e.target.value)}
                          />
                          {sensitive && (
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                              onClick={() => setMasked(prev => ({ ...prev, [i]: !isHidden }))}
                            >
                              {isHidden ? <TbEye size={14} /> : <TbEyeOff size={14} />}
                            </button>
                          )}
                        </div>
                        <button
                          className="btn btn-xs btn-ghost btn-circle text-error opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeVar(i)}
                        >
                          <TbTrash size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-base-content/30">
              <div className="text-center">
                <TbLock size={48} className="mx-auto opacity-20 mb-3" />
                <p className="text-sm">Select a .env file to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="toast toast-end z-50">
          <div className={`alert ${toast.ok ? "alert-success" : "alert-error"} text-xs py-2 px-4 rounded-xl shadow-xl`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
