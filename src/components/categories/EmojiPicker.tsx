import { Input } from "@/components/ui/input";

const PRESET_ICONS = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R",
  "S", "T", "U", "V", "W", "X",
  "*", "#", "!", "?", "+", "@",
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-10 gap-1">
        {PRESET_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            className="w-8 h-8 rounded hover:bg-muted text-lg font-bold flex items-center justify-center"
            style={{
              outline: value === icon ? "2px solid var(--ring)" : "none",
            }}
            onClick={() => onChange(icon)}
          >
            {icon}
          </button>
        ))}
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type an icon letter"
        className="h-8 w-28 text-xs"
      />
    </div>
  );
}
