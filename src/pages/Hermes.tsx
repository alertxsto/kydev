import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TbRefresh, TbPlayerPlayFilled, TbPlayerStopFilled, TbRotateClockwise2,
  TbDownload, TbTrash, TbStethoscope, TbSettings, TbPlus,
  TbAlertTriangle, TbX, TbRobot, TbTrashX,
} from "react-icons/tb";
import HermesPlatformCard, { type PlatformDef } from "../components/HermesPlatformCard";
import HermesConfigModal from "../components/HermesConfigModal";

// ── Platform Definitions ─────────────────────────────────────────

const platforms: PlatformDef[] = [
  { id: "telegram", name: "Telegram", emoji: "📱", tokenVar: "TELEGRAM_BOT_TOKEN", envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS", "TELEGRAM_HOME_CHANNEL", "TELEGRAM_HOME_CHANNEL_NAME", "TELEGRAM_WEBHOOK_URL", "TELEGRAM_WEBHOOK_PORT"] },
  { id: "discord", name: "Discord", emoji: "💬", tokenVar: "DISCORD_BOT_TOKEN", envVars: ["DISCORD_BOT_TOKEN", "DISCORD_ALLOWED_USERS"] },
  { id: "slack", name: "Slack", emoji: "💼", tokenVar: "SLACK_BOT_TOKEN", envVars: ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_ALLOWED_USERS"] },
  { id: "whatsapp", name: "WhatsApp", emoji: "📲", tokenVar: "WHATSAPP_ENABLED", envVars: ["WHATSAPP_ENABLED", "WHATSAPP_ALLOWED_USERS"] },
  { id: "signal", name: "Signal", emoji: "📡", tokenVar: "SIGNAL_PHONE_NUMBER", envVars: ["SIGNAL_PHONE_NUMBER"] },
  { id: "email", name: "Email", emoji: "📧", tokenVar: "EMAIL_ADDRESS", envVars: ["EMAIL_ADDRESS", "EMAIL_PASSWORD", "EMAIL_IMAP_HOST", "EMAIL_IMAP_PORT", "EMAIL_SMTP_HOST", "EMAIL_SMTP_PORT", "EMAIL_POLL_INTERVAL", "EMAIL_ALLOWED_USERS", "EMAIL_HOME_ADDRESS"] },
  { id: "matrix", name: "Matrix", emoji: "🔐", tokenVar: "MATRIX_ACCESS_TOKEN", envVars: ["MATRIX_HOME_SERVER", "MATRIX_USER_ID", "MATRIX_ACCESS_TOKEN"] },
  { id: "mattermost", name: "Mattermost", emoji: "💬", tokenVar: "MATTERMOST_TOKEN", envVars: ["MATTERMOST_URL", "MATTERMOST_TOKEN"] },
  { id: "google_chat", name: "Google Chat", emoji: "💬", tokenVar: "GOOGLE_CHAT_PROJECT_ID", envVars: ["GOOGLE_CHAT_PROJECT_ID", "GOOGLE_CHAT_SUBSCRIPTION_NAME", "GOOGLE_CHAT_SERVICE_ACCOUNT_JSON", "GOOGLE_CHAT_ALLOWED_USERS", "GOOGLE_CHAT_ALLOW_ALL_USERS", "GOOGLE_CHAT_HOME_CHANNEL", "GOOGLE_CHAT_HOME_CHANNEL_NAME"] },
  { id: "teams", name: "Teams", emoji: "💼", tokenVar: "TEAMS_CLIENT_ID", envVars: ["TEAMS_CLIENT_ID", "TEAMS_CLIENT_SECRET", "TEAMS_TENANT_ID", "TEAMS_ALLOWED_USERS", "TEAMS_ALLOW_ALL_USERS", "TEAMS_HOME_CHANNEL", "TEAMS_HOME_CHANNEL_NAME", "TEAMS_PORT"] },
  { id: "sms", name: "SMS (Twilio)", emoji: "📱", tokenVar: "TWILIO_ACCOUNT_SID", envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] },
  { id: "dingtalk", name: "DingTalk", emoji: "💬", tokenVar: "DINGTALK_TOKEN", envVars: ["DINGTALK_TOKEN"] },
  { id: "feishu", name: "Feishu / Lark", emoji: "🪽", tokenVar: "FEISHU_APP_ID", envVars: ["FEISHU_APP_ID", "FEISHU_APP_SECRET"] },
  { id: "wecom", name: "WeCom", emoji: "💬", tokenVar: "WECOM_WEBHOOK_URL", envVars: ["WECOM_WEBHOOK_URL"] },
  { id: "wecom_callback", name: "WeCom Callback", emoji: "💬", tokenVar: "WECOM_CALLBACK_TOKEN", envVars: ["WECOM_CALLBACK_TOKEN", "WECOM_CALLBACK_ENCODING_AES_KEY"] },
  { id: "weixin", name: "Weixin / WeChat", emoji: "💬", tokenVar: "WEIXIN_APP_ID", envVars: ["WEIXIN_APP_ID", "WEIXIN_APP_SECRET"] },
  { id: "bluebubbles", name: "BlueBubbles (iMessage)", emoji: "💬", tokenVar: "BLUEBUBBLES_API_KEY", envVars: ["BLUEBUBBLES_URL", "BLUEBUBBLES_API_KEY"] },
  { id: "qqbot", name: "QQ Bot", emoji: "🐧", tokenVar: "QQBOT_APP_ID", envVars: ["QQBOT_APP_ID", "QQBOT_TOKEN"] },
  { id: "yuanbao", name: "Yuanbao", emoji: "💎", tokenVar: "YUANBAO_API_KEY", envVars: ["YUANBAO_API_KEY"] },
  { id: "irc", name: "IRC", emoji: "💬", tokenVar: "IRC_NICKNAME", envVars: ["IRC_NICKNAME", "IRC_SERVER", "IRC_CHANNEL"] },
  { id: "line", name: "LINE", emoji: "💚", tokenVar: "LINE_CHANNEL_ACCESS_TOKEN", envVars: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"] },
  { id: "homeassistant", name: "Home Assistant", emoji: "🏠", tokenVar: "HOMEASSISTANT_TOKEN", envVars: ["HOMEASSISTANT_URL", "HOMEASSISTANT_TOKEN"] },
  { id: "gateway", name: "Gateway-wide", emoji: "⚙️", tokenVar: "GATEWAY_ALLOW_ALL_USERS", envVars: ["GATEWAY_ALLOW_ALL_USERS"] },
];

// ── Types ──────────────────────────────────────────────────────────

interface HermesInfo { installed: boolean; version: string; path: string; }

// ── Helpers ─────────────────────────────────────────────────────────

function parseEnv(env: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

function setEnvVar(env: string, key: string, value: string): string {
  const lines = env.split('\n');
  let found = false;
  const result = lines.map(line => {
    if (found) return line;
    const t = line.trim();
    if (!t) return line;
    const isComment = t.startsWith('#');
    const content = isComment ? t.slice(1).trim() : t;
    const i = content.indexOf('=');
    if (i === -1) return line;
    if (content.slice(0, i).trim() !== key) return line;
    found = true;
    return `${key}=${value}`;
  });
  if (!found) {
    if (result.length > 0 && result[result.length - 1] !== '') result.push('');
    result.push(`# ${key}`);
    result.push(`${key}=${value}`);
  }
  return result.join('\n');
}

// ── Tabs ────────────────────────────────────────────────────────────

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "platforms", label: "Messaging Platforms" },
  { id: "cron", label: "Automation & Cron" },
  { id: "model", label: "Model & Provider" },
  { id: "sessions", label: "Sessions & Logs" },
];

// ── Component ───────────────────────────────────────────────────────

export default function Hermes() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [info, setInfo] = useState<HermesInfo | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState("");
  const [envContent, setEnvContent] = useState("");
  const [configContent, setConfigContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [configPlatform, setConfigPlatform] = useState<PlatformDef | null>(null);
  const [cronOutput, setCronOutput] = useState("");
  const [cronForm, setCronForm] = useState({ schedule: "", name: "", prompt: "", deliver: "origin", show: false });
  const [cronRemoveId, setCronRemoveId] = useState("");
  const [sessionsOutput, setSessionsOutput] = useState("");
  const [statusOutput, setStatusOutput] = useState("");
  const [logType, setLogType] = useState("gateway");
  const [logLines, setLogLines] = useState(50);
  const [logOutput, setLogOutput] = useState("");
  const [doctorOutput, setDoctorOutput] = useState("");
  const [doctorLoading, setDoctorLoading] = useState(false);

  // Model/Provider form
  const [modelForm, setModelForm] = useState({ model: "", provider: "", baseUrl: "", reasoning: "medium" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [i, gs, env, cfg] = await Promise.all([
        invoke<HermesInfo>("hermes_check_installed"),
        invoke<string>("hermes_gateway_action", { action: "status" }),
        invoke<string>("hermes_env_read"),
        invoke<string>("hermes_config_read"),
      ]);
      setInfo(i);
      setGatewayStatus(gs);
      setEnvContent(env);
      setConfigContent(cfg);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function gatewayAction(action: string) {
    setActionLoading(action);
    try {
      await invoke<string>("hermes_gateway_action", { action });
      const gs = await invoke<string>("hermes_gateway_action", { action: "status" });
      setGatewayStatus(gs);
    } catch (e) { console.error(e); }
    setActionLoading(null);
  }

  async function refreshTab(tab: string) {
    try {
      switch (tab) {
        case "platforms": {
          const env = await invoke<string>("hermes_env_read");
          setEnvContent(env); break;
        }
        case "cron": {
          const c = await invoke<string>("hermes_cron_list");
          setCronOutput(c); break;
        }
        case "sessions": {
          const [s, l] = await Promise.all([
            invoke<string>("hermes_sessions_list"),
            invoke<string>("hermes_get_logs", { logType, lines: logLines }),
          ]);
          setSessionsOutput(s); setLogOutput(l); break;
        }
        case "model": {
          const cfg = await invoke<string>("hermes_config_read");
          setConfigContent(cfg); break;
        }
        default: {
          const [i, gs] = await Promise.all([
            invoke<HermesInfo>("hermes_check_installed"),
            invoke<string>("hermes_gateway_action", { action: "status" }),
          ]);
          setInfo(i); setGatewayStatus(gs); break;
        }
      }
    } catch (e) { console.error(e); }
  }

  const envMap = parseEnv(envContent);

  function isConfigured(p: PlatformDef): boolean {
    const val = envMap[p.tokenVar];
    return val !== undefined && val !== '' && val !== 'false';
  }

  function handleConfigSave(updates: Record<string, string>) {
    let newEnv = envContent;
    for (const [k, v] of Object.entries(updates)) {
      newEnv = setEnvVar(newEnv, k, v);
    }
    invoke<string>("hermes_env_write", { content: newEnv }).then(() => {
      setEnvContent(newEnv);
      setConfigPlatform(null);
    }).catch(console.error);
  }

  async function handleCronCreate() {
    if (!cronForm.schedule) return;
    try {
      await invoke<string>("hermes_cron_create", {
        schedule: cronForm.schedule,
        name: cronForm.name || null,
        prompt: cronForm.prompt || null,
        deliver: cronForm.deliver === "origin" ? null : cronForm.deliver,
        repeat: null,
      });
      setCronForm({ schedule: "", name: "", prompt: "", deliver: "origin", show: false });
      const c = await invoke<string>("hermes_cron_list");
      setCronOutput(c);
    } catch (e) { console.error(e); }
  }

  async function handleCronRemove() {
    if (!cronRemoveId) return;
    try {
      await invoke<string>("hermes_cron_remove", { jobId: cronRemoveId });
      setCronRemoveId("");
      const c = await invoke<string>("hermes_cron_list");
      setCronOutput(c);
    } catch (e) { console.error(e); }
  }

  async function handleLogRefresh() {
    try {
      const l = await invoke<string>("hermes_get_logs", { logType, lines: logLines });
      setLogOutput(l);
    } catch (e) { console.error(e); }
  }

  async function handleDoctor() {
    setDoctorLoading(true);
    try {
      const d = await invoke<string>("hermes_run_doctor");
      setDoctorOutput(d);
    } catch (e) { console.error(e); }
    setDoctorLoading(false);
  }

  async function handleStatus() {
    try {
      const s = await invoke<string>("hermes_get_status");
      setStatusOutput(s);
    } catch (e) { console.error(e); }
  }

  function handleModelSave() {
    invoke<string>("hermes_config_set", { key: "model.default", value: modelForm.model }).catch(console.error);
    invoke<string>("hermes_config_set", { key: "model.provider", value: modelForm.provider }).catch(console.error);
    if (modelForm.baseUrl) invoke<string>("hermes_config_set", { key: "model.base_url", value: modelForm.baseUrl }).catch(console.error);
    invoke<string>("hermes_config_set", { key: "agent.reasoning_effort", value: modelForm.reasoning }).catch(console.error);
  }

  // ── Load tab data on switch ──
  useEffect(() => {
    if (!loading) refreshTab(activeTab);
  }, [activeTab]);

  // ── Parse model config ──
  useEffect(() => {
    for (const line of configContent.split('\n')) {
      const t = line.trim();
      if (t.startsWith('default:')) setModelForm(p => ({ ...p, model: t.split(':').slice(1).join(':').trim() }));
      if (t.startsWith('provider:')) setModelForm(p => ({ ...p, provider: t.split(':').slice(1).join(':').trim() }));
      if (t.startsWith('base_url:')) setModelForm(p => ({ ...p, baseUrl: t.split(':').slice(1).join(':').trim() }));
      if (t.startsWith('reasoning_effort:')) setModelForm(p => ({ ...p, reasoning: t.split(':').slice(1).join(':').trim() }));
    }
  }, [configContent]);

  const gatewayRunning = gatewayStatus.toLowerCase().includes("running");
  const gatewayNotInstalled = gatewayStatus.toLowerCase().includes("not installed") || gatewayStatus.toLowerCase().includes("install");
  const gatewayStopped = !gatewayRunning && !gatewayNotInstalled;

  // ── Render ──

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <TbRobot size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Hermes Agent Manager</h2>
            {info?.installed && (
              <p className="text-xs text-base-content/50 mt-0.5">
                v{info.version.split(" ").filter(s => s.startsWith("v") || s.startsWith("0") || s.startsWith("1") || s.startsWith("2"))[0] || info.version}
                {" · "}{info.path}
              </p>
            )}
          </div>
        </div>
        {!info?.installed && (
          <div className="badge badge-soft badge-error gap-1.5 py-3 px-3">
            <TbX size={14} />
            Not Installed
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200/70 gap-0.5 p-0.5">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            onClick={() => setActiveTab(t.id)}
            className={`tab tab-sm text-xs font-medium transition-all ${activeTab === t.id ? "tab-active bg-primary text-primary-content shadow-sm" : "text-base-content/50 hover:text-base-content"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         TAB 1: DASHBOARD
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {!info?.installed && (
            <div className="relative rounded-2xl border border-error/30 bg-error/5 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-error/20 text-error"><TbAlertTriangle size={20} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Hermes is not installed</p>
                  <p className="text-xs text-base-content/50 mt-0.5">Install via the Hermes CLI or run the quick install script</p>
                </div>
              </div>
            </div>
          )}

          {/* Gateway Status Card */}
          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${gatewayRunning ? "from-green-500/10 to-emerald-600/5" : gatewayStopped ? "from-amber-500/10 to-amber-600/5" : "from-base-300/30 to-base-300/10"} pointer-events-none`} />
            <div className="relative p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`relative flex h-2.5 w-2.5 ${gatewayRunning ? "text-green-400" : gatewayStopped ? "text-amber-400" : "text-base-content/30"}`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gatewayRunning ? "bg-green-400" : ""}`} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current" />
                  </span>
                  <span className="font-semibold text-sm">Gateway</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    gatewayRunning ? "bg-green-500/15 text-green-400" : gatewayStopped ? "bg-amber-500/15 text-amber-400" : "bg-base-300/50 text-base-content/40"
                  }`}>
                    {gatewayRunning ? "Running" : gatewayStopped ? "Stopped" : "Not Installed"}
                  </span>
                </div>
                <button onClick={() => refreshTab("dashboard")} className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-base-content">
                  <TbRefresh size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {gatewayRunning ? (
                  <button onClick={() => gatewayAction("stop")} disabled={actionLoading === "stop"} className="btn btn-sm btn-soft btn-error gap-1.5">
                    {actionLoading === "stop" ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerStopFilled size={14} />}
                    Stop
                  </button>
                ) : (
                  <button onClick={() => gatewayAction("start")} disabled={actionLoading === "start" || !info?.installed || gatewayNotInstalled} className="btn btn-sm btn-soft btn-success gap-1.5">
                    {actionLoading === "start" ? <span className="loading loading-spinner loading-xs" /> : <TbPlayerPlayFilled size={14} />}
                    Start
                  </button>
                )}
                <button onClick={() => gatewayAction("restart")} disabled={actionLoading === "restart" || !info?.installed} className="btn btn-sm btn-soft btn-warning gap-1.5">
                  {actionLoading === "restart" ? <span className="loading loading-spinner loading-xs" /> : <TbRotateClockwise2 size={14} />}
                  Restart
                </button>
                {gatewayNotInstalled ? (
                  <button onClick={() => gatewayAction("install --force")} disabled={actionLoading === "install --force" || !info?.installed} className="btn btn-sm btn-soft btn-primary gap-1.5">
                    {actionLoading === "install --force" ? <span className="loading loading-spinner loading-xs" /> : <TbDownload size={14} />}
                    Install Service
                  </button>
                ) : (
                  <button onClick={() => gatewayAction("uninstall")} disabled={actionLoading === "uninstall" || !info?.installed} className="btn btn-sm btn-soft btn-neutral gap-1.5">
                    {actionLoading === "uninstall" ? <span className="loading loading-spinner loading-xs" /> : <TbTrash size={14} />}
                    Uninstall Service
                  </button>
                )}
              </div>
              {gatewayStatus && (
                <pre className="bg-base-300/50 rounded-xl p-3 text-[10px] font-mono text-base-content/50 overflow-x-auto">{gatewayStatus}</pre>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleDoctor} disabled={doctorLoading} className="relative rounded-2xl border border-base-300/40 bg-base-200/70 p-4 flex items-center gap-3 hover:border-primary/30 transition-all text-left">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400"><TbStethoscope size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Run Doctor</p>
                <p className="text-xs text-base-content/50 mt-0.5">Check configuration and dependencies</p>
              </div>
              {doctorLoading && <span className="loading loading-spinner loading-sm text-primary" />}
            </button>
            <button onClick={handleStatus} className="relative rounded-2xl border border-base-300/40 bg-base-200/70 p-4 flex items-center gap-3 hover:border-primary/30 transition-all text-left">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><TbRobot size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Full Status</p>
                <p className="text-xs text-base-content/50 mt-0.5">Show all component status</p>
              </div>
            </button>
          </div>

          {/* Status / Doctor Output */}
          {doctorOutput && (
            <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-base-content/10">
                <span className="text-xs font-semibold text-base-content/70">Doctor Output</span>
                <button onClick={() => setDoctorOutput("")} className="btn btn-ghost btn-xs btn-square text-base-content/30"><TbX size={14} /></button>
              </div>
              <pre className="p-3 text-[10px] font-mono text-base-content/60 overflow-x-auto max-h-80 overflow-y-auto">{doctorOutput}</pre>
            </div>
          )}
          {statusOutput && (
            <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-base-content/10">
                <span className="text-xs font-semibold text-base-content/70">Status Output</span>
                <button onClick={() => setStatusOutput("")} className="btn btn-ghost btn-xs btn-square text-base-content/30"><TbX size={14} /></button>
              </div>
              <pre className="p-3 text-[10px] font-mono text-base-content/60 overflow-x-auto max-h-80 overflow-y-auto">{statusOutput}</pre>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         TAB 2: MESSAGING PLATFORMS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "platforms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-base-content/50">{platforms.length} platforms</p>
            <button onClick={() => refreshTab("platforms")} className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content">
              <TbRefresh size={14} /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {platforms.map(p => (
              <HermesPlatformCard
                key={p.id}
                platform={p}
                configured={isConfigured(p)}
                onConfigure={() => setConfigPlatform(p)}
              />
            ))}
          </div>
          {configPlatform && (
            <HermesConfigModal
              platform={configPlatform}
              envMap={envMap}
              onSave={handleConfigSave}
              onClose={() => setConfigPlatform(null)}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         TAB 3: AUTOMATION & CRON
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "cron" && (
        <div className="space-y-4">
          {/* Add Cron Form */}
          {cronForm.show && (
            <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
              <div className="p-4 space-y-3">
                <h4 className="font-semibold text-sm">New Cron Job</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-base-content/70 block mb-1">Schedule *</label>
                    <p className="text-[10px] text-base-content/40 mb-1">e.g. <code className="text-primary">30m</code>, <code className="text-primary">every 2h</code>, or <code className="text-primary">0 9 * * *</code></p>
                    <input
                      className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm"
                      placeholder="30m"
                      value={cronForm.schedule}
                      onChange={e => setCronForm(p => ({ ...p, schedule: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/70 block mb-1">Name</label>
                    <input
                      className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm"
                      placeholder="My job"
                      value={cronForm.name}
                      onChange={e => setCronForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-base-content/70 block mb-1">Prompt / Task</label>
                    <input
                      className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm"
                      placeholder="What should the agent do?"
                      value={cronForm.prompt}
                      onChange={e => setCronForm(p => ({ ...p, prompt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/70 block mb-1">Deliver To</label>
                    <select
                      className="select select-sm w-full bg-base-300/50 border-base-content/20 text-sm"
                      value={cronForm.deliver}
                      onChange={e => setCronForm(p => ({ ...p, deliver: e.target.value }))}
                    >
                      <option value="origin">Origin</option>
                      <option value="local">Local</option>
                      <option value="telegram">Telegram</option>
                      <option value="discord">Discord</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleCronCreate} disabled={!cronForm.schedule} className="btn btn-sm btn-primary gap-1.5">
                    <TbPlus size={14} /> Create Job
                  </button>
                  <button onClick={() => setCronForm(p => ({ ...p, show: false }))} className="btn btn-sm btn-ghost text-base-content/50">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {!cronForm.show && (
                <button onClick={() => setCronForm(p => ({ ...p, show: true }))} className="btn btn-sm btn-primary gap-1.5">
                  <TbPlus size={14} /> New Job
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  className="input input-xs w-36 bg-base-300/50 border-base-content/20 text-[11px]"
                  placeholder="Job ID to delete"
                  value={cronRemoveId}
                  onChange={e => setCronRemoveId(e.target.value)}
                />
                <button onClick={handleCronRemove} disabled={!cronRemoveId} className="btn btn-xs btn-soft btn-error gap-1">
                  <TbTrashX size={12} /> Delete
                </button>
              </div>
            </div>
            <button onClick={() => refreshTab("cron")} className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content">
              <TbRefresh size={14} /> Refresh
            </button>
          </div>

          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className="p-0">
              {cronOutput ? (
                <pre className="p-4 text-xs font-mono text-base-content/60 overflow-x-auto whitespace-pre-wrap">{cronOutput}</pre>
              ) : (
                <div className="p-8 text-center text-sm text-base-content/30">
                  No cron jobs. Click "New Job" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         TAB 4: MODEL & PROVIDER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "model" && (
        <div className="space-y-4">
          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Model Configuration</h4>
                <button onClick={() => refreshTab("model")} className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content">
                  <TbRefresh size={14} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">Model</label>
                  <input
                    className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm font-mono"
                    placeholder="nvidia/nemotron-3-super-120b-a12b:free"
                    value={modelForm.model}
                    onChange={e => setModelForm(p => ({ ...p, model: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">Provider</label>
                  <select
                    className="select select-sm w-full bg-base-300/50 border-base-content/20 text-sm"
                    value={modelForm.provider}
                    onChange={e => setModelForm(p => ({ ...p, provider: e.target.value }))}
                  >
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="google">Google / Gemini</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                    <option value="zai">Z.AI / GLM</option>
                    <option value="kimi">Kimi / Moonshot</option>
                    <option value="minimax">MiniMax</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="ollama">Ollama</option>
                    <option value="bedrock">AWS Bedrock</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">Base URL</label>
                  <input
                    className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm font-mono"
                    placeholder="https://openrouter.ai/api/v1"
                    value={modelForm.baseUrl}
                    onChange={e => setModelForm(p => ({ ...p, baseUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">
                    Reasoning Effort: <span className="text-primary font-bold">{modelForm.reasoning}</span>
                  </label>
                  <div className="flex items-center gap-3 pt-1.5">
                    <span className="text-[10px] text-base-content/40">Low</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      className="range range-xs range-primary"
                      value={["low", "medium", "high"].indexOf(modelForm.reasoning) >= 0 ? ["low", "medium", "high"].indexOf(modelForm.reasoning) : 1}
                      onChange={e => setModelForm(p => ({ ...p, reasoning: ["low", "medium", "high"][Number(e.target.value)] || "medium" }))}
                    />
                    <span className="text-[10px] text-base-content/40">High</span>
                  </div>
                </div>
              </div>
              <button onClick={handleModelSave} className="btn btn-sm btn-primary gap-1.5">
                <TbSettings size={14} /> Save Model Config
              </button>
            </div>
          </div>

          {/* Raw config display */}
          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-base-content/10">
              <span className="text-xs font-semibold text-base-content/70">Raw config.yaml (model section)</span>
            </div>
            <pre className="p-3 text-[10px] font-mono text-base-content/50 overflow-x-auto max-h-60 overflow-y-auto">
              {configContent.split('\n').filter(l => l.trim() && (l.trim().startsWith("model") || l.trim().startsWith("  ") || l.trim().startsWith("agent"))).join('\n') || "No config data"}
            </pre>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         TAB 5: SESSIONS & LOGS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "sessions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sessions */}
          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-base-content/10">
              <span className="text-xs font-semibold text-base-content/70">Recent Sessions</span>
              <button onClick={() => refreshTab("sessions")} className="btn btn-ghost btn-xs gap-1.5 text-base-content/40 hover:text-base-content">
                <TbRefresh size={14} />
              </button>
            </div>
            <div className="p-0 max-h-96 overflow-y-auto">
              {sessionsOutput ? (
                <pre className="p-3 text-[10px] font-mono text-base-content/60 whitespace-pre-wrap">{sessionsOutput}</pre>
              ) : (
                <div className="p-8 text-center text-sm text-base-content/30">No session data</div>
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-base-content/10">
              <span className="text-xs font-semibold text-base-content/70">Log Viewer</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="select select-xs bg-base-300/50 border-base-content/20 text-xs"
                  value={logType}
                  onChange={e => { setLogType(e.target.value); }}
                >
                  <option value="agent">Agent Log</option>
                  <option value="gateway">Gateway Log</option>
                  <option value="errors">Error Log</option>
                </select>
                <select
                  className="select select-xs bg-base-300/50 border-base-content/20 text-xs"
                  value={logLines}
                  onChange={e => { setLogLines(Number(e.target.value)); }}
                >
                  <option value={20}>20 lines</option>
                  <option value={50}>50 lines</option>
                  <option value={100}>100 lines</option>
                  <option value={200}>200 lines</option>
                </select>
                <button onClick={handleLogRefresh} className="btn btn-ghost btn-xs gap-1 text-base-content/40">
                  <TbRefresh size={12} /> Load
                </button>
              </div>
              <pre className="bg-base-300/50 rounded-xl p-3 text-[10px] font-mono text-base-content/50 overflow-x-auto max-h-80 overflow-y-auto min-h-[160px]">
                {logOutput || "Click Load to fetch logs."}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
