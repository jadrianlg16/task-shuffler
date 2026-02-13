import type { TimeFilter, TimeFilterMode } from "@/types";
import { Input } from "@/components/ui/input";

export function TimeFilterControl({
  value,
  onChange,
}: {
  value: TimeFilter;
  onChange: (filter: TimeFilter) => void;
}) {
  const setMode = (mode: TimeFilterMode) => {
    onChange({ ...value, mode });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={value.mode}
        onChange={(e) => setMode(e.target.value as TimeFilterMode)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8"
      >
        <option value="any">Any Time</option>
        <option value="max">&le; Max</option>
        <option value="min">&ge; Min</option>
        <option value="range">Range</option>
        <option value="exact">Exact</option>
      </select>

      {(value.mode === "max" || value.mode === "min" || value.mode === "exact") && (
        <Input
          type="number"
          min={1}
          value={value.value ?? ""}
          onChange={(e) =>
            onChange({ ...value, value: e.target.value ? parseInt(e.target.value) : undefined })
          }
          placeholder="min"
          className="w-20 h-8"
        />
      )}

      {value.mode === "range" && (
        <>
          <Input
            type="number"
            min={1}
            value={value.min ?? ""}
            onChange={(e) =>
              onChange({ ...value, min: e.target.value ? parseInt(e.target.value) : undefined })
            }
            placeholder="from"
            className="w-20 h-8"
          />
          <span className="text-xs text-muted-foreground">&ndash;</span>
          <Input
            type="number"
            min={1}
            value={value.max ?? ""}
            onChange={(e) =>
              onChange({ ...value, max: e.target.value ? parseInt(e.target.value) : undefined })
            }
            placeholder="to"
            className="w-20 h-8"
          />
        </>
      )}

      {value.mode !== "any" && (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={value.includeNoDuration}
            onChange={(e) =>
              onChange({ ...value, includeNoDuration: e.target.checked })
            }
            className="rounded"
          />
          Include no-duration
        </label>
      )}
    </div>
  );
}
