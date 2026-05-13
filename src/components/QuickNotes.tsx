import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TbNotes, TbX, TbDeviceFloppy, TbCheck } from "react-icons/tb";

interface QuickNotesProps { open: boolean; onClose: () => void; }

export default function QuickNotes({ open, onClose }: QuickNotesProps) {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      invoke("get_notes").then(n => setContent(n as string)).catch(() => {});
    }
  }, [open]);

  const saveNotes = async (text: string) => {
    try {
      await invoke("save_notes", { content: text });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleChange = (text: string) => {
    setContent(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNotes(text), 1200);
  };

  if (!open) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split("\n").length;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      
      {/* Panel */}
      <div
        className="relative w-[380px] h-full flex flex-col pointer-events-auto shadow-2xl border-l border-base-content/10"
        style={{ background: "var(--color-base-200)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10 shrink-0">
          <div className="flex items-center gap-2">
            <TbNotes size={16} className="text-primary" />
            <span className="font-bold text-sm">Quick Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-xs gap-1 text-base-content/50"
              onClick={() => saveNotes(content)}
            >
              {saved ? <TbCheck size={13} className="text-success" /> : <TbDeviceFloppy size={13} />}
              {saved ? "Saved" : "Save"}
            </button>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={onClose}>
              <TbX size={14} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <textarea
          className="flex-1 w-full resize-none bg-transparent p-4 text-sm font-mono leading-relaxed outline-none"
          placeholder={`# Notes\n\nWrite anything here...\n\n- Todos\n- IP addresses\n- Commands to remember\n- Quick thoughts`}
          value={content}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
        />

        {/* Footer */}
        <div className="px-4 py-2 border-t border-base-content/10 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-base-content/30 font-mono">
            {wordCount} words · {lineCount} lines
          </p>
          <p className="text-[10px] text-base-content/30">Auto-saved to ~/.local/share/kydev/notes.md</p>
        </div>
      </div>
    </div>
  );
}
