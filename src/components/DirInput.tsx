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
      {label && <label className="label"><span className="label-text font-bold text-base">{label}</span></label>}
      <div className="flex gap-3">
        <input
          type="text"
          className="input input-bordered w-full font-mono text-base px-4 py-3 h-12"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
        />
        <button className="btn btn-outline btn-square shrink-0 h-12 w-12 text-base font-semibold" onClick={browse} title="Browse">
          <TbFolderSearch size={20} />
        </button>
      </div>
    </div>
  );
}
