import { TbSettings } from "react-icons/tb";

export interface PlatformDef {
  id: string;
  name: string;
  emoji: string;
  tokenVar: string;
  envVars: string[];
}

interface Props {
  platform: PlatformDef;
  configured: boolean;
  onConfigure: () => void;
}

export default function HermesPlatformCard({ platform, configured, onConfigure }: Props) {
  return (
    <div className="relative rounded-2xl border border-base-300/40 bg-base-200/70 overflow-hidden group hover:border-primary/30 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${configured ? "from-green-500/5 to-emerald-600/5" : "from-base-300/30 to-base-300/10"} pointer-events-none`} />
      <div className="relative p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{platform.emoji}</span>
            <span className="font-semibold text-sm">{platform.name}</span>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            configured
              ? "bg-green-500/15 text-green-400 border border-green-500/20"
              : "bg-base-300/50 text-base-content/40 border border-base-content/10"
          }`}>
            {configured ? "Configured" : "Not Configured"}
          </span>
        </div>
        <p className="text-[10px] text-base-content/40 leading-relaxed line-clamp-2">
          {configured
            ? `${platform.tokenVar} is set`
            : `Set ${platform.tokenVar} to enable`}
        </p>
        <button
          onClick={onConfigure}
          className="btn btn-ghost btn-xs w-full gap-1.5 text-base-content/50 hover:text-primary hover:bg-primary/10"
        >
          <TbSettings size={14} />
          Configure
        </button>
      </div>
    </div>
  );
}
