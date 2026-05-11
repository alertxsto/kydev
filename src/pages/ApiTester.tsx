import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbApi, TbSend } from "react-icons/tb";

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("http://localhost:3000/api");
  const [headers, setHeaders] = useState("Content-Type: application/json");
  const [body, setBody] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<string>("");
  const [history, setHistory] = useState<{url:string; method:string; time:string}[]>([]);

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setResponse("");
    setStatus("Loading...");
    try {
      const res: string = await invoke("send_http_request", { method, url, body, headers });
      
      // curl -i returns headers then an empty line then the body
      const parts = res.split("\r\n\r\n");
      let headerStr = parts[0];
      let bodyStr = parts.slice(1).join("\r\n\r\n");
      
      if (!bodyStr && res.includes("\n\n")) {
          const parts2 = res.split("\n\n");
          headerStr = parts2[0];
          bodyStr = parts2.slice(1).join("\n\n");
      }

      const statusLine = headerStr.split("\n")[0];
      setStatus(statusLine);
      
      try {
        const parsed = JSON.parse(bodyStr);
        setResponse(headerStr + "\n\n" + JSON.stringify(parsed, null, 2));
      } catch {
        setResponse(res);
      }
      
      setHistory(prev => [{ url, method, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 15));
    } catch (e) {
      setStatus("Error");
      setResponse(String(e));
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2"><TbApi /> Built-in API Tester</h2>
        <p className="text-xs text-base-content/50 mt-1">Send requests to local APIs without CORS restrictions</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        <div className="w-48 border-r border-base-content/10 bg-base-200/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 font-bold text-xs uppercase tracking-wider text-base-content/50">History</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.map((h, i) => (
              <div key={i} className="p-2 bg-base-100 border border-base-content/10 rounded cursor-pointer hover:border-primary transition-colors" onClick={() => { setUrl(h.url); setMethod(h.method); }}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-bold ${h.method==='GET'?'text-success':h.method==='POST'?'text-warning':h.method==='DELETE'?'text-error':'text-info'}`}>{h.method}</span>
                  <span className="text-[9px] opacity-50">{h.time}</span>
                </div>
                <div className="text-[10px] truncate opacity-70" title={h.url}>{h.url}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-xs text-center p-4 opacity-50">No history yet</div>}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-4 overflow-y-auto flex flex-col">
            <div className="flex gap-2 mb-4">
              <select className="select select-bordered w-32 font-bold" value={method} onChange={e => setMethod(e.target.value)}>
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
              </select>
              <input type="text" className="input input-bordered flex-1 font-mono text-sm" placeholder="http://localhost:..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendRequest()} />
              <button className="btn btn-primary" onClick={sendRequest} disabled={loading}>
                {loading ? <span className="loading loading-spinner" /> : <TbSend />} Send
              </button>
            </div>

            <div className="mb-4">
              <label className="label"><span className="label-text font-bold">Headers (one per line)</span></label>
              <textarea className="textarea textarea-bordered w-full font-mono text-xs h-24" placeholder="Authorization: Bearer token..." value={headers} onChange={e => setHeaders(e.target.value)}></textarea>
            </div>

            <div className="mb-4 flex-1 flex flex-col">
              <label className="label"><span className="label-text font-bold">Request Body</span></label>
              <textarea className="textarea textarea-bordered w-full font-mono text-xs flex-1 min-h-[200px]" placeholder='{"key": "value"}' value={body} onChange={e => setBody(e.target.value)} disabled={method === "GET"}></textarea>
            </div>
          </div>

          <div className="w-1/2 bg-base-300 flex flex-col">
            <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Response</span>
              <div className={`badge ${status.includes("200") || status.includes("201") ? "badge-success" : status.includes("Error") ? "badge-error" : "badge-neutral"}`}>
                {status || "Ready"}
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-xs leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
              {response || "Enter an endpoint and hit Send..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
