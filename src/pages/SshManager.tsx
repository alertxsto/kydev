import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbServer2, TbPlus, TbTrash, TbTerminal2, TbX,
  TbRefresh, TbCheck,
} from "react-icons/tb";

interface SshHost { alias: string; hostname: string; user: string; port: string; identity_file: string; }

const blank = (): SshHost => ({ alias: "", hostname: "", user: "", port: "22", identity_file: "" });

export default function SshManager() {
  const [hosts, setHosts] = useState<SshHost[]>([]);
  const [selected, setSelected] = useState<SshHost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SshHost>(blank());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setHosts(await invoke("get_ssh_hosts") as SshHost[]); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showT = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const addHost = async () => {
    if (!form.alias || !form.hostname) return;
    try {
      await invoke("add_ssh_host", { host: form });
      showT("Host added to ~/.ssh/config", true);
      setShowForm(false);
      setForm(blank());
      await load();
    } catch (e) { showT(String(e), false); }
  };

  const deleteHost = async (alias: string) => {
    try {
      await invoke("delete_ssh_host", { alias });
      showT("Host removed", true);
      if (selected?.alias === alias) setSelected(null);
      await load();
    } catch (e) { showT(String(e), false); }
  };

  const openTerminal = (host: SshHost) => {
    const cmd = `${host.user ? host.user + "@" : ""}${host.hostname} -p ${host.port}${host.identity_file ? " -i " + host.identity_file : ""}`;
    invoke("open_in_editor", { path: cmd, editor: "ssh" }).catch(() => {});
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-base-content/10 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TbServer2 size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">SSH Manager</h2>
              <p className="text-sm text-base-content/50 mt-0.5">Manage your <code className="text-primary">~/.ssh/config</code> hosts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-outline gap-1" onClick={load}><TbRefresh size={14} /> Refresh</button>
            <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowForm(true)}><TbPlus size={14} /> Add Host</button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Host list */}
        <div className="w-72 border-r border-base-content/10 flex flex-col bg-base-100 shrink-0">
          <div className="p-2 border-b border-base-content/10 bg-base-200/30 shrink-0">
            <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">{hosts.length} hosts</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary" /></div>
            ) : hosts.length === 0 ? (
              <div className="text-center py-8 text-base-content/40">
                <TbServer2 size={32} className="mx-auto opacity-20 mb-2" />
                <p className="text-xs">No SSH hosts found</p>
                <p className="text-[10px] mt-1 opacity-70">Add a host or check ~/.ssh/config</p>
              </div>
            ) : hosts.map(h => (
              <button
                key={h.alias}
                className={`w-full text-left rounded-xl p-3 transition-all ${selected?.alias === h.alias ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
                onClick={() => setSelected(h)}
              >
                <p className="font-bold text-sm">{h.alias}</p>
                <p className={`text-xs font-mono mt-0.5 ${selected?.alias === h.alias ? "opacity-70" : "text-base-content/50"}`}>
                  {h.user ? `${h.user}@` : ""}{h.hostname}:{h.port}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <>
              <div className="p-5 border-b border-base-content/10 bg-base-200/30 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl">{selected.alias}</h3>
                  <div className="flex flex-col gap-1 mt-3 text-sm">
                    {[
                      { label: "Hostname", val: selected.hostname },
                      { label: "User", val: selected.user || "—" },
                      { label: "Port", val: selected.port },
                      { label: "Identity File", val: selected.identity_file || "—" },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-40 w-24">{r.label}</span>
                        <span className="font-mono text-xs">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary gap-1.5" onClick={() => openTerminal(selected)}>
                    <TbTerminal2 size={14} /> Connect
                  </button>
                  <button className="btn btn-ghost text-error gap-1" onClick={() => deleteHost(selected.alias)}>
                    <TbTrash size={14} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="rounded-xl bg-base-300 border border-base-content/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-40 mb-2">SSH Command</p>
                  <code className="font-mono text-sm text-primary">
                    ssh {selected.alias}
                  </code>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-base-content/30">
              <div className="text-center">
                <TbServer2 size={48} className="mx-auto opacity-20 mb-3" />
                <p className="text-sm">Select a host to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Host Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-base-300/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add SSH Host</h3>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowForm(false)}><TbX size={16} /></button>
            </div>
            {[
              { key: "alias", label: "Alias (Host)", placeholder: "my-server" },
              { key: "hostname", label: "Hostname / IP", placeholder: "192.168.1.100" },
              { key: "user", label: "User", placeholder: "ubuntu" },
              { key: "port", label: "Port", placeholder: "22" },
              { key: "identity_file", label: "Identity File (optional)", placeholder: "~/.ssh/id_rsa" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold mb-1 block">{f.label}</label>
                <input
                  className="input input-bordered w-full text-sm font-mono"
                  placeholder={f.placeholder}
                  value={form[f.key as keyof SshHost]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button className="btn btn-primary flex-1 gap-1.5" onClick={addHost}><TbCheck size={14} /> Save Host</button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast toast-end z-50">
          <div className={`alert ${toast.ok ? "alert-success" : "alert-error"} text-xs py-2 px-4 rounded-xl`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
