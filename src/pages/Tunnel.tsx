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
      setPid("");
      setLogs("Tunnel stopped.");
      setUrl("");
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async () => {
    if (!pid) return;
    try {
      const out: string = await invoke("get_tunnel_log");
      setLogs(out);
      const match = out.match(/your url is: (https:\/\/[^\s]+)/);
      if (match) setUrl(match[1]);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    let interval: any;
    if (pid) interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [pid]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2"><TbWorldWww /> Localhost Tunneling</h2>
        <p className="text-xs text-base-content/50 mt-1">Expose local ports to the internet instantly using localtunnel.</p>
      </div>

      <div className="p-8 flex-1 flex flex-col items-center justify-center">
        <div className="card bg-base-200 w-full max-w-md shadow-xl border border-base-content/10">
          <div className="card-body text-center">
            <h3 className="card-title justify-center mb-4">Port Forwarding</h3>
            
            <div className="flex gap-2 justify-center mb-6">
              <input type="number" className="input input-bordered w-32 font-mono text-center text-lg" value={port} onChange={e => setPort(Number(e.target.value))} disabled={!!pid} />
              {!pid ? (
                <button className="btn btn-primary" onClick={startTunnel}><TbPlayerPlayFilled /> Expose Port</button>
              ) : (
                <button className="btn btn-error" onClick={stopTunnel}><TbPlayerStopFilled /> Stop Tunnel</button>
              )}
            </div>

            {pid && (
              <div className="bg-base-300 p-4 rounded-lg mt-4 border border-base-content/10">
                <p className="text-xs text-base-content/50 uppercase tracking-wider mb-2 font-bold">Public URL</p>
                {url ? (
                  <div className="flex gap-2">
                    <input type="text" className="input input-sm input-bordered w-full font-mono text-success text-center" readOnly value={url} />
                    <button className="btn btn-sm btn-outline" onClick={() => navigator.clipboard.writeText(url)}><TbCopy /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="loading loading-spinner loading-xs" /> Requesting tunnel...
                  </div>
                )}
                <div className="mt-4 text-left">
                  <p className="text-[10px] text-base-content/40 font-mono whitespace-pre-wrap">{logs}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
