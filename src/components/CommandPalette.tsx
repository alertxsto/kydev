import { useState, useEffect, useRef } from "react";
import { TbSearch, TbArrowRight } from "react-icons/tb";

interface CommandItem {
  id: string;
  label: string;
  icon: any;
}

interface CommandPaletteProps {
  items: CommandItem[];
  onSelect: (id: string) => void;
}

export default function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.id.toLowerCase().includes(query.toLowerCase())
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-base-300/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl overflow-hidden border border-base-content/10 flex flex-col max-h-[60vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-base-content/10 gap-3">
          <TbSearch className="text-xl text-primary" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-base font-medium"
            placeholder="Search commands or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="kbd kbd-sm font-sans opacity-50">ESC</kbd>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-base-content/40">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/40">Navigation</div>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-colors ${
                      isSelected ? "bg-primary text-primary-content" : "hover:bg-base-200"
                    }`}
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`text-lg ${isSelected ? "opacity-100" : "opacity-60"}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isSelected && <TbArrowRight className="opacity-70" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-base-content/10 bg-base-200/50 flex items-center justify-between text-[10px] text-base-content/50">
          <span><kbd className="kbd kbd-xs">↑</kbd> <kbd className="kbd kbd-xs">↓</kbd> to navigate</span>
          <span><kbd className="kbd kbd-xs">Enter</kbd> to select</span>
        </div>
      </div>
    </div>
  );
}
