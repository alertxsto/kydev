import { useState, useEffect, useRef } from "react";
import { TbSearch, TbArrowRight } from "react-icons/tb";

interface CommandItem {
  id: string;
  label: string;
  /** Optional short name — also used for palette search */
  shortLabel?: string;
  icon: any;
}

interface CommandPaletteProps {
  items: CommandItem[];
  onSelect: (id: string) => void;
  open?: boolean;
  onClose?: () => void;
}

export default function CommandPalette({ items, onSelect, open: externalOpen, onClose }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external open prop
  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [externalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") {
        setOpen(false);
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase();
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    (item.shortLabel && item.shortLabel.toLowerCase().includes(q))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex].id);
        setOpen(false);
      }
    }
  };

  const handleClose = () => { setOpen(false); onClose?.(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-base-300/80 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl overflow-hidden border border-base-content/10 flex flex-col max-h-[60vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-5 py-4 border-b border-base-content/10 gap-3">
          <TbSearch className="text-2xl text-primary" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-lg font-medium"
            placeholder="Search commands or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="kbd kbd-sm font-sans opacity-60 text-xs font-bold">ESC</kbd>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-base text-base-content/40 font-medium">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-base-content/50">Navigation</div>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                      isSelected ? "bg-primary text-primary-content shadow-lg" : "hover:bg-base-200/70"
                    }`}
                    onClick={() => {
                      onSelect(item.id);
                      handleClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`text-xl ${isSelected ? "opacity-100" : "opacity-70"}`} />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                    {isSelected && <TbArrowRight className="opacity-80 text-lg" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-base-content/10 bg-base-200/50 flex items-center justify-between text-xs text-base-content/60 font-medium">
          <span><kbd className="kbd kbd-xs text-xs">↑</kbd> <kbd className="kbd kbd-xs text-xs">↓</kbd> navigate</span>
          <span><kbd className="kbd kbd-xs text-xs">Enter</kbd> select</span>
        </div>
      </div>
    </div>
  );
}
