import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import DirInput from "../components/DirInput";
import { TbWand, TbCode, TbCheck, TbTerminal } from "react-icons/tb";

const templates = [
  { id: "nextjs", name: "Next.js", desc: "React framework with Tailwind & TS", color: "text-white" },
  { id: "vite-react", name: "Vite + React", desc: "Fast React TS scaffolding", color: "text-blue-400" },
  { id: "rust", name: "Rust", desc: "Cargo binary project", color: "text-orange-400" },
  { id: "go", name: "Go Module", desc: "Basic Go module init", color: "text-cyan-400" },
  { id: "python", name: "Python", desc: "Venv and main.py", color: "text-green-400" },
];

export default function Scaffolder() {
  const [name, setName] = useState("");
  const [path, setPath] = useState("~/projects");
  const [template, setTemplate] = useState("nextjs");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [addons, setAddons] = useState<string[]>([]);

  const toggleAddon = (a: string) => {
    setAddons((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const runScaffold = async () => {
    if (!name.trim() || !path.trim()) return;
    setLoading(true);
    setOutput(`Scaffolding ${template} project '${name}' in ${path}...\n`);
    try {
      const res = await invoke("scaffold_project", { name, path, template, addons });
      setOutput((prev) => prev + "\n" + res + "\n\nDone! Open in Projects tab.");
    } catch (e) {
      setOutput((prev) => prev + "\nError: " + e);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbWand size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Project Bootstrapper</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Instantly generate projects with native CLI tools</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-6 overflow-y-auto space-y-6">
          <DirInput label="Project Name" value={name} onChange={setName} placeholder="my-awesome-app" />
          <DirInput label="Location (Parent Folder)" value={path} onChange={setPath} placeholder="~/projects" />

          <div>
            <label className="label"><span className="label-text font-semibold">Template</span></label>
            <div className="grid grid-cols-1 gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border p-3 cursor-pointer flex items-center gap-3 transition-all ${
                    template === t.id
                      ? "border-primary bg-primary/5 shadow-sm shadow-primary/5"
                      : "border-base-content/10 hover:border-primary/50 bg-base-200/30"
                  }`}
                  onClick={() => setTemplate(t.id)}
                >
                  <div className={`p-2 rounded-lg ${template === t.id ? "bg-primary text-primary-content" : "bg-base-300"}`}>
                    <TbCode className="text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm">{t.name}</h4>
                    <p className="text-xs text-base-content/60">{t.desc}</p>
                  </div>
                  {template === t.id && <TbCheck className="text-primary shrink-0" size={18} />}
                </div>
              ))}
            </div>
          </div>

          {(template === "nextjs" || template === "vite-react") && (
            <div>
              <label className="label"><span className="label-text font-semibold">Add-ons</span></label>
              <div className="flex flex-wrap gap-3">
                {["prisma", "zustand", "tailwind", "shadcn"].map((a) => (
                  <label key={a} className={`cursor-pointer border rounded-xl p-3 flex items-center gap-2 transition-all hover:bg-base-200/50 ${
                    addons.includes(a) ? "border-primary bg-primary/5" : "border-base-content/10"
                  }`}>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={addons.includes(a)}
                      onChange={() => toggleAddon(a)}
                    />
                    <span className="font-semibold text-sm capitalize">{a}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary w-full gap-2" disabled={!name || loading} onClick={runScaffold}>
            {loading ? <span className="loading loading-spinner" /> : <TbWand size={16} />}
            Generate Project
          </button>
        </div>

        {/* Right: Log */}
        <div className="w-1/2 bg-base-300 flex flex-col">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <TbTerminal className="opacity-50" size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Execution Log</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {output || <span className="text-base-content/30 italic">Awaiting initialization...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
