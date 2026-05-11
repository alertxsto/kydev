import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbSettings, TbFileCode } from "react-icons/tb";

interface ConfigEntry { name: string; path: string; category: string; }

export default function Config() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConfigs = async () => {
    setConfigs(await invoke("get_config_files") as ConfigEntry[]);
  };

  const readConfig = async (path: string) => {
    setLoading(true); setSelected(path);
    setContent(await invoke("read_config_file", { path }) as string);
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  const categories = [...new Set(configs.map((c) => c.category))];

  return (
    <div className="p-6 h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbSettings size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuration Files</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Quick access to config files</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 shrink-0 rounded-2xl border border-base-content/10 bg-base-200/50 p-3 overflow-y-auto space-y-2">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-base-content/40 px-2 pt-2 pb-1 font-bold">{cat}</p>
              {configs.filter((c) => c.category === cat).map((c) => (
                <button
                  key={c.path}
                  onClick={() => readConfig(c.path)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-all flex items-center gap-2 ${
                    selected === c.path
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-base-content/70 hover:bg-base-300 hover:text-base-content"
                  }`}
                >
                  <TbFileCode size={14} className="opacity-50" />
                  {c.name}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border border-base-content/10 bg-base-200/30 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-full"><span className="loading loading-spinner text-primary" /></div>
          ) : selected ? (
            <>
              <div className="px-4 py-2 bg-base-200/50 border-b border-base-content/10 flex items-center gap-2 shrink-0">
                <TbFileCode size={14} className="opacity-50" />
                <span className="text-xs font-mono text-base-content/60">{selected}</span>
              </div>
              <pre className="flex-1 p-4 text-xs font-mono text-base-content/80 whitespace-pre-wrap overflow-y-auto leading-relaxed">{content}</pre>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-base-content/40 text-sm">Select a config file from the left</div>
          )}
        </div>
      </div>
    </div>
  );
}
