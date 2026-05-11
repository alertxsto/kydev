import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbWorldWww, TbPlayerPlayFilled, TbPlayerStopFilled, TbCopy } from "react-icons/tb";

export default function Tunnel() {
  const [port, setPort] = useState(3000);
  const [pid, setPid] = useState("");
  const [logs, setLogs] = useState("");
  const [url, setUrl] = useState("");

  const startTunnel = async () => {
    try {
      const newPid: string = await invoke("start_tunnel", { port: Number(port) });
      setPid(newPid.trim());
    } catch (e) { console.error(e); }
  };

  const stopTunnel = async () => {
    if (!pid) return;
    try {
      await invoke("stop_tunnel", { pid });
      setPid(""); setLogs("Tunnel stopped."); setUrl("");
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async () => {
    if (!pid) return;
    try {
      const out: string = await invoke("get_tunnel_log");
      setLogs(out);
      const match = out.match(/your url is: (https:\/\/[^\s]+)/);
      if (match) setUrl(match[1]);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let interval: any;
    if (pid) interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [pid]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbWorldWww size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Localhost Tunneling</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Expose local ports to the internet via localtunnel</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-base-content/10 bg-base-200/50 p-6 space-y-6">
          <h3 className="text-lg font-bold text-center">Port Forwarding</h3>

          <div className="flex gap-2 justify-center">
            <input
              type="number"
              className="input input-bordered w-28 text-center text-lg font-mono"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              disabled={!!pid}
            />
            {!pid ? (
              <button className="btn btn-primary gap-1" onClick={startTunnel}>
                <TbPlayerPlayFilled size={16} /> Expose Port
              </button>
            ) : (
              <button className="btn btn-error gap-1" onClick={stopTunnel}>
                <TbPlayerStopFilled size={16} /> Stop Tunnel
              </button>
            )}
          </div>

          {pid && (
            <div className="bg-base-300/70 rounded-xl p-4 space-y-3 border border-base-content/10">
              <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold">Public URL</p>
              {url ? (
                <div className="flex gap-2">
                  <input type="text" className="input input-sm input-bordered w-full font-mono text-success text-center" readOnly value={url} />
                  <button className="btn btn-sm btn-outline" onClick={() => navigator.clipboard.writeText(url)}><TbCopy size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="loading loading-spinner loading-xs" /> Requesting tunnel...
                </div>
              )}
              <pre className="text-[10px] text-base-content/40 font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">{logs}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
