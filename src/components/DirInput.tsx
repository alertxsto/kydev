import { open } from "@tauri-apps/plugin-dialog";
import { TbFolderSearch } from "react-icons/tb";

interface DirInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  onEnter?: () => void;
}

export default function DirInput({ value, onChange, placeholder, label, onEnter }: DirInputProps) {
  const browse = async () => {
    const dir = await open({ directory: true, title: label || "Select directory" });
    if (dir) onChange(dir);
  };

  return (
    <div>
      {label && <label className="label"><span className="label-text font-semibold">{label}</span></label>}
      <div className="flex gap-2">
        <input
          type="text"
          className="input input-bordered w-full font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
        />
        <button className="btn btn-outline btn-square shrink-0" onClick={browse} title="Browse">
          <TbFolderSearch size={18} />
        </button>
      </div>
    </div>
  );
}
