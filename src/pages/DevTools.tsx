import { useState } from "react";

export default function DevTools() {
  const [activeTab, setActiveTab] = useState("json");
  const [inputStr, setInputStr] = useState("");
  const [outputStr, setOutputStr] = useState("");
  const [errorStr, setErrorStr] = useState("");

  const formatJson = () => {
    try {
      const parsed = JSON.parse(inputStr);
      setOutputStr(JSON.stringify(parsed, null, 2));
      setErrorStr("");
    } catch (e: any) {
      setErrorStr(e.message);
    }
  };

  const encodeBase64 = () => {
    try {
      setOutputStr(btoa(inputStr));
      setErrorStr("");
    } catch (e: any) {
      setErrorStr("Cannot encode to Base64");
    }
  };

  const decodeBase64 = () => {
    try {
      setOutputStr(atob(inputStr));
      setErrorStr("");
    } catch (e: any) {
      setErrorStr("Invalid Base64 string");
    }
  };

  const decodeJwt = () => {
    try {
      const parts = inputStr.split('.');
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format. Must have 3 parts separated by dots.");
      }
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      setOutputStr(JSON.stringify({ header, payload }, null, 2));
      setErrorStr("");
    } catch (e: any) {
      setErrorStr(e.message || "Invalid JWT");
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold">Developer Tools</h2>
        <p className="text-sm text-neutral-content/50 mt-1">Common utilities for developers</p>
      </div>

      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={`tab ${activeTab === "json" ? "tab-active" : ""}`}
          onClick={() => { setActiveTab("json"); setOutputStr(""); setErrorStr(""); }}
        >
          JSON Formatter
        </button>
        <button
          className={`tab ${activeTab === "base64" ? "tab-active" : ""}`}
          onClick={() => { setActiveTab("base64"); setOutputStr(""); setErrorStr(""); }}
        >
          Base64
        </button>
        <button
          className={`tab ${activeTab === "jwt" ? "tab-active" : ""}`}
          onClick={() => { setActiveTab("jwt"); setOutputStr(""); setErrorStr(""); }}
        >
          JWT Decoder
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col bg-base-200 rounded-box p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">Input</span>
          </div>
          <textarea
            className="textarea textarea-bordered flex-1 bg-base-300 font-mono text-sm resize-none focus:outline-none"
            placeholder={
              activeTab === "json" ? '{"foo": "bar"}' :
              activeTab === "base64" ? "Enter text here..." :
              "eyJo..."
            }
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            {activeTab === "json" && (
              <button className="btn btn-primary btn-sm" onClick={formatJson}>Format JSON</button>
            )}
            {activeTab === "base64" && (
              <>
                <button className="btn btn-primary btn-sm" onClick={encodeBase64}>Encode</button>
                <button className="btn btn-secondary btn-sm" onClick={decodeBase64}>Decode</button>
              </>
            )}
            {activeTab === "jwt" && (
              <button className="btn btn-primary btn-sm" onClick={decodeJwt}>Decode JWT</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => { setInputStr(""); setOutputStr(""); setErrorStr(""); }}>Clear</button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col bg-base-200 rounded-box p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">Output</span>
            {errorStr && <span className="text-xs text-error font-semibold">{errorStr}</span>}
          </div>
          <textarea
            className="textarea textarea-bordered flex-1 bg-base-300 font-mono text-sm resize-none focus:outline-none"
            readOnly
            value={outputStr}
            placeholder="Result will appear here..."
          />
        </div>
      </div>
    </div>
  );
}
