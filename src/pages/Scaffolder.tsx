import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbWand, TbFolder, TbCode, TbCheck, TbTerminal } from "react-icons/tb";

const templates = [
  { id: "nextjs", name: "Next.js", desc: "React framework with Tailwind & TS", icon: TbCode },
  { id: "vite-react", name: "Vite + React", desc: "Fast React TS scaffolding", icon: TbCode },
  { id: "rust", name: "Rust", desc: "Cargo binary project", icon: TbCode },
  { id: "go", name: "Go Module", desc: "Basic Go module init", icon: TbCode },
  { id: "python", name: "Python", desc: "Venv and main.py", icon: TbCode },
];

export default function Scaffolder() {
  const [name, setName] = useState("");
  const [path, setPath] = useState("~/projects");
  const [template, setTemplate] = useState("nextjs");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [addons, setAddons] = useState<string[]>([]);

  const toggleAddon = (a: string) => {
    setAddons(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const runScaffold = async () => {
    if (!name.trim() || !path.trim()) return;
    setLoading(true);
    setOutput(`Scaffolding ${template} project '${name}' in ${path}...\nThis may take a minute for JS frameworks.\n`);
    try {
      const res = await invoke("scaffold_project", { name, path, template, addons });
      setOutput((prev) => prev + "\n" + res + "\n\nDONE! You can open it in Antigravity from the Projects tab.");
    } catch (e) {
      setOutput((prev) => prev + "\nError: " + e);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2"><TbWand /> Project Bootstrapper</h2>
        <p className="text-xs text-base-content/50 mt-1">Instantly generate new projects using native CLI tools in the background.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-6 overflow-y-auto">
          <div className="form-control w-full mb-4">
            <label className="label"><span className="label-text font-bold">Project Name</span></label>
            <input type="text" placeholder="my-awesome-app" className="input input-bordered w-full font-mono text-sm" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="form-control w-full mb-6">
            <label className="label"><span className="label-text font-bold">Location (Parent Folder)</span></label>
            <div className="flex gap-2">
              <TbFolder className="text-2xl opacity-50 mt-2" />
              <input type="text" className="input input-bordered w-full font-mono text-sm" value={path} onChange={e => setPath(e.target.value)} />
            </div>
          </div>

          <label className="label"><span className="label-text font-bold">Template</span></label>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {templates.map(t => (
              <div 
                key={t.id}
                className={`border rounded-lg p-3 cursor-pointer flex items-center gap-3 transition-all ${template === t.id ? 'border-primary bg-primary/10' : 'border-base-content/20 hover:border-primary/50'}`}
                onClick={() => setTemplate(t.id)}
              >
                <div className={`p-2 rounded-md ${template === t.id ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>
                  <t.icon className="text-xl" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{t.name}</h4>
                  <p className="text-xs text-base-content/60">{t.desc}</p>
                </div>
                {template === t.id && <TbCheck className="text-primary text-xl" />}
              </div>
            ))}
          </div>

          {(template === "nextjs" || template === "vite-react") && (
            <>
              <label className="label mt-2"><span className="label-text font-bold">Auto-Install Add-ons</span></label>
              <div className="flex gap-4 mb-6">
                <label className="cursor-pointer border border-base-content/10 rounded-box p-3 flex items-center gap-2 hover:bg-base-200/50">
                  <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={addons.includes("prisma")} onChange={() => toggleAddon("prisma")} />
                  <span className="font-bold text-sm">Prisma ORM</span>
                </label>
                <label className="cursor-pointer border border-base-content/10 rounded-box p-3 flex items-center gap-2 hover:bg-base-200/50">
                  <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={addons.includes("zustand")} onChange={() => toggleAddon("zustand")} />
                  <span className="font-bold text-sm">Zustand</span>
                </label>
              </div>
            </>
          )}

          <button className="btn btn-primary w-full" disabled={!name || loading} onClick={runScaffold}>
            {loading ? <span className="loading loading-spinner" /> : <TbWand className="text-lg mr-1" />}
            Generate Project
          </button>
        </div>

        <div className="w-1/2 bg-base-300 flex flex-col">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <TbTerminal className="opacity-50" />
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Execution Log</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
            {output || "Awaiting initialization..."}
          </div>
        </div>
      </div>
    </div>
  );
}
