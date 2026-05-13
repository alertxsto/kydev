import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbApi, TbSend, TbHistory } from "react-icons/tb";

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("http://localhost:3000/api");
  const [headers, setHeaders] = useState("Content-Type: application/json");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<string>("");
  const [history, setHistory] = useState<{ url: string; method: string; time: string }[]>([]);

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true); setResponse(""); setStatus("Loading...");
    try {
      const res: string = await invoke("send_http_request", { method, url, body, headers });
      const parsedRes = JSON.parse(res);
      setStatus(`HTTP ${parsedRes.status}`);
      const headerStr = Object.entries(parsedRes.headers).map(([k, v]) => `${k}: ${v}`).join("\n");
      try {
        const parsedBody = JSON.parse(parsedRes.body);
        setResponse(headerStr + "\n\n" + JSON.stringify(parsedBody, null, 2));
      } catch {
        setResponse(headerStr + "\n\n" + parsedRes.body);
      }
      setHistory((prev) => [{ url, method, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 15));
    } catch (e) { setStatus("Error"); setResponse(String(e)); }
    setLoading(false);
  };

  const badgeColor = (m: string) => {
    const colors: Record<string, string> = { GET: "badge-success", POST: "badge-warning", PUT: "badge-info", DELETE: "badge-error", PATCH: "badge-neutral" };
    return colors[m] || "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbApi size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Tester</h2>
          <p className="text-sm text-base-content/50 mt-0.5">Send HTTP requests without CORS restrictions</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* History */}
        <div className="w-44 border-r border-base-content/10 bg-base-200/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center gap-2">
            <TbHistory size={14} className="opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">History</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="p-2 bg-base-100 border border-base-content/10 rounded-xl cursor-pointer hover:border-primary transition-colors"
                onClick={() => { setUrl(h.url); setMethod(h.method); }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`badge badge-xs ${badgeColor(h.method)}`}>{h.method}</span>
                  <span className="text-[9px] text-base-content/40">{h.time}</span>
                </div>
                <div className="text-[10px] truncate text-base-content/60">{h.url}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-xs text-center p-4 text-base-content/40 italic">No history</div>}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Request */}
          <div className="w-1/2 border-r border-base-content/10 bg-base-100 p-4 overflow-y-auto flex flex-col space-y-4">
            <div className="flex gap-2">
              <select className="select select-bordered w-28 font-bold text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
              </select>
              <input type="text" className="input input-bordered flex-1 font-mono text-sm" placeholder="http://localhost:..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendRequest()} />
              <button className="btn btn-primary gap-1" onClick={sendRequest} disabled={loading}>
                {loading ? <span className="loading loading-spinner" /> : <TbSend size={16} />} Send
              </button>
            </div>

            <div className="flex-1 flex flex-col space-y-2">
              <div>
                <label className="text-xs font-semibold">Headers</label>
                <textarea className="textarea textarea-bordered w-full font-mono text-xs h-20 mt-1 rounded-xl" placeholder="Authorization: Bearer token..." value={headers} onChange={(e) => setHeaders(e.target.value)} />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-semibold">Request Body</label>
                <textarea className="textarea textarea-bordered w-full font-mono text-xs flex-1 mt-1 rounded-xl min-h-[120px]" placeholder='{"key": "value"}' value={body} onChange={(e) => setBody(e.target.value)} disabled={method === "GET"} />
              </div>
            </div>
          </div>

          {/* Response */}
          <div className="w-1/2 bg-base-300 flex flex-col">
            <div className="p-3 border-b border-base-content/10 bg-base-200/50 shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Response</span>
              <span className={`badge badge-sm ${status.includes("200") || status.includes("201") ? "badge-success" : status.includes("Error") ? "badge-error" : "badge-ghost"}`}>
                {status || "Ready"}
              </span>
            </div>
            <div className="flex-1 p-4 font-mono text-xs leading-relaxed text-base-content/70 overflow-y-auto whitespace-pre-wrap">
              {response || <span className="text-base-content/30 italic">Enter an endpoint and hit Send...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
