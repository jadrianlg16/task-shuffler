import { Input } from "@/components/ui/input";

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#6B7280",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4",
  "#D946EF", "#A855F7", "#0EA5E9", "#F43F5E",
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value === color ? "white" : "transparent",
              boxShadow: value === color ? `0 0 0 2px ${color}` : "none",
            }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#hex"
        className="h-8 w-28 text-xs"
      />
    </div>
  );
}
