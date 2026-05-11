import { useState } from "react";
import { TbX, TbDeviceFloppy } from "react-icons/tb";
import type { PlatformDef } from "./HermesPlatformCard";

interface Props {
  platform: PlatformDef;
  envMap: Record<string, string>;
  onSave: (updates: Record<string, string>) => void;
  onClose: () => void;
}

const varDescriptions: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: "Bot token from @BotFather on Telegram",
  TELEGRAM_ALLOWED_USERS: "Comma-separated Telegram user IDs",
  TELEGRAM_HOME_CHANNEL: "Default chat ID for cron delivery",
  TELEGRAM_HOME_CHANNEL_NAME: "Display name for home channel",
  DISCORD_BOT_TOKEN: "Bot token from Discord Developer Portal",
  DISCORD_ALLOWED_USERS: "Comma-separated Discord user IDs",
  SLACK_BOT_TOKEN: "Bot token (starts with xoxb-)",
  SLACK_APP_TOKEN: "App-level token (starts with xapp-)",
  SLACK_ALLOWED_USERS: "Comma-separated Slack user IDs",
  WHATSAPP_ENABLED: "Set true to enable WhatsApp integration",
  WHATSAPP_ALLOWED_USERS: "Phone numbers with country code",
  EMAIL_ADDRESS: "Email address for the bot",
  EMAIL_PASSWORD: "App password (not regular password)",
  EMAIL_IMAP_HOST: "IMAP server hostname",
  EMAIL_IMAP_PORT: "IMAP server port",
  EMAIL_SMTP_HOST: "SMTP server hostname",
  EMAIL_SMTP_PORT: "SMTP server port",
  EMAIL_POLL_INTERVAL: "Poll interval in seconds",
  EMAIL_ALLOWED_USERS: "Comma-separated allowed email addresses",
  EMAIL_HOME_ADDRESS: "Default email address for cron delivery",
  MATRIX_HOME_SERVER: "Matrix homeserver URL",
  MATRIX_USER_ID: "Matrix user ID (@user:server)",
  MATRIX_ACCESS_TOKEN: "Matrix access token",
  MATTERMOST_URL: "Mattermost server URL",
  MATTERMOST_TOKEN: "Mattermost personal access token",
  GOOGLE_CHAT_PROJECT_ID: "GCP project ID hosting the Pub/Sub topic",
  GOOGLE_CHAT_SUBSCRIPTION_NAME: "Full Pub/Sub subscription path",
  GOOGLE_CHAT_SERVICE_ACCOUNT_JSON: "Path to service account JSON key",
  GOOGLE_CHAT_ALLOWED_USERS: "Comma-separated allowed email addresses",
  GOOGLE_CHAT_HOME_CHANNEL: "Default space ID for cron delivery",
  TEAMS_CLIENT_ID: "Azure AD App (client) ID",
  TEAMS_CLIENT_SECRET: "Azure AD client secret",
  TEAMS_TENANT_ID: "Azure AD tenant ID",
  TEAMS_ALLOWED_USERS: "Comma-separated AAD object IDs or UPNs",
  TEAMS_PORT: "Webhook listen port (default: 3978)",
  GATEWAY_ALLOW_ALL_USERS: "Allow all users without allowlist (true/false)",
  SIGNAL_PHONE_NUMBER: "Signal phone number with country code",
};

export default function HermesConfigModal({ platform, envMap, onSave, onClose }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of platform.envVars) {
      initial[v] = envMap[v] ?? "";
    }
    return initial;
  });

  function handleChange(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-base-200 rounded-2xl border border-base-300/40 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{platform.emoji}</span>
            <h3 className="font-bold text-sm">{platform.name} Configuration</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content">
            <TbX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {platform.envVars.length === 0 ? (
            <p className="text-sm text-base-content/50 text-center py-4">
              No environment variables are needed for this platform.
            </p>
          ) : (
            platform.envVars.map(ev => (
              <div key={ev}>
                <label className="text-xs font-semibold text-base-content/70 block mb-1">{ev}</label>
                {varDescriptions[ev] && (
                  <p className="text-[10px] text-base-content/40 mb-1.5">{varDescriptions[ev]}</p>
                )}
                <input
                  type={ev.includes("TOKEN") || ev.includes("SECRET") || ev.includes("PASSWORD") ? "password" : "text"}
                  className="input input-sm w-full bg-base-300/50 border-base-content/20 text-sm focus:border-primary/50"
                  placeholder={ev.includes("TOKEN") || ev.includes("SECRET") ? "••••••••" : `Set ${ev}...`}
                  value={form[ev] ?? ""}
                  onChange={e => handleChange(ev, e.target.value)}
                />
              </div>
            ))
          )}

          {/* Allow all users toggle (if GATEWAY_ALLOW_ALL_USERS is in envVars) */}
          {platform.envVars.includes("GATEWAY_ALLOW_ALL_USERS") && (
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={form["GATEWAY_ALLOW_ALL_USERS"] === "true"}
                onChange={e => handleChange("GATEWAY_ALLOW_ALL_USERS", e.target.checked ? "true" : "false")}
              />
              <span className="text-xs text-base-content/70">Allow all users (no allowlist)</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-content/10">
          <button onClick={onClose} className="btn btn-ghost btn-sm text-base-content/50">Cancel</button>
          <button onClick={handleSave} className="btn btn-sm btn-primary gap-1.5">
            <TbDeviceFloppy size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
