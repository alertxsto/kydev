import { useState } from "react";
import { TbTools, TbCode, TbLock, TbKey } from "react-icons/tb";

export default function DevTools() {
  const [activeTab, setActiveTab] = useState("json");
  const [inputStr, setInputStr] = useState("");
  const [outputStr, setOutputStr] = useState("");
  const [errorStr, setErrorStr] = useState("");

  const formatJson = () => {
    try { const parsed = JSON.parse(inputStr); setOutputStr(JSON.stringify(parsed, null, 2)); setErrorStr(""); }
    catch (e: any) { setErrorStr(e.message); }
  };

  const encodeBase64 = () => {
    try { setOutputStr(btoa(inputStr)); setErrorStr(""); }
    catch { setErrorStr("Cannot encode to Base64"); }
  };

  const decodeBase64 = () => {
    try { setOutputStr(atob(inputStr)); setErrorStr(""); }
    catch { setErrorStr("Invalid Base64 string"); }
  };

  const decodeJwt = () => {
    try {
      const parts = inputStr.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      setOutputStr(JSON.stringify({ header, payload }, null, 2));
      setErrorStr("");
    } catch (e: any) { setErrorStr(e.message || "Invalid JWT"); }
  };

  const tabs = [
    { id: "json", label: "JSON Formatter", icon: TbCode },
    { id: "base64", label: "Base64", icon: TbLock },
    { id: "jwt", label: "JWT Decoder", icon: TbKey },
  ];

  return (
    <div className="p-6 h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbTools size={22} /></div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Developer Tools</h2>
          <p className="text-sm text-base-content/50 mt-0.5">JSON, Base64 & JWT utilities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-base-200/50 p-1 rounded-xl w-fit border border-base-content/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === t.id ? "bg-primary text-primary-content shadow-sm" : "hover:text-base-content"
            }`}
            onClick={() => { setActiveTab(t.id); setOutputStr(""); setErrorStr(""); }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Input</span>
          </div>
          <textarea
            className="textarea textarea-bordered flex-1 bg-base-300 font-mono text-sm resize-none focus:outline-none rounded-xl"
            placeholder={
              activeTab === "json" ? '{"foo": "bar"}' :
              activeTab === "base64" ? "Enter text here..." : "eyJo..."
            }
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            {activeTab === "json" && <button className="btn btn-primary btn-sm" onClick={formatJson}>Format JSON</button>}
            {activeTab === "base64" && (
              <>
                <button className="btn btn-primary btn-sm" onClick={encodeBase64}>Encode</button>
                <button className="btn btn-secondary btn-sm" onClick={decodeBase64}>Decode</button>
              </>
            )}
            {activeTab === "jwt" && <button className="btn btn-primary btn-sm" onClick={decodeJwt}>Decode JWT</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => { setInputStr(""); setOutputStr(""); setErrorStr(""); }}>Clear</button>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Output</span>
            {errorStr && <span className="text-xs text-error font-semibold">{errorStr}</span>}
          </div>
          <textarea
            className="textarea textarea-bordered flex-1 bg-base-300 font-mono text-sm resize-none focus:outline-none rounded-xl"
            readOnly
            value={outputStr}
            placeholder="Result will appear here..."
          />
        </div>
      </div>
    </div>
  );
}
