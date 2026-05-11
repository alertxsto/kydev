interface ConfigEntry {
  name: string;
  path: string;
  category: string;
}

export default function Config() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConfigs = async () => {
    const res = await invoke("get_config_files");
    setConfigs(res as ConfigEntry[]);
  };

  const readConfig = async (path: string) => {
    setLoading(true);
    setSelected(path);
    const res = await invoke("read_config_file", { path });
    setContent(res as string);
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  const categories = [...new Set(configs.map((c) => c.category))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Config</h2>
        <p className="text-sm text-neutral-content/50 mt-1">Quick access to configuration files</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-56 shrink-0 bg-base-200 rounded-box p-2 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-neutral-content/40 px-2 pt-3 pb-1">
                {cat}
              </p>
              {configs
                .filter((c) => c.category === cat)
                .map((c) => (
                  <button
                    key={c.path}
                    onClick={() => readConfig(c.path)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selected === c.path
                        ? "bg-primary/10 text-primary"
                        : "text-neutral-content/70 hover:text-neutral-content hover:bg-base-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-base-200 rounded-box overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : selected ? (
            <pre className="text-xs p-4 overflow-y-auto h-full font-mono text-neutral-content/80 whitespace-pre-wrap">
              {content}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-content/40 text-sm">Select a config file from the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
