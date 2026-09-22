import type { TimeFilter, TimeFilterMode } from "@/types";

const numberField = { width: 76 } as const;

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

  const num = (raw: string) => (raw ? parseInt(raw) : undefined);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={value.mode}
        aria-label="Time filter"
        onChange={(e) => setMode(e.target.value as TimeFilterMode)}
        className="field"
      >
        <option value="any">Any length</option>
        <option value="max">At most…</option>
        <option value="min">At least…</option>
        <option value="range">Between…</option>
        <option value="exact">Exactly…</option>
      </select>

      {(value.mode === "max" || value.mode === "min" || value.mode === "exact") && (
        <input
          type="number"
          min={1}
          aria-label="Minutes"
          value={value.value ?? ""}
          onChange={(e) => onChange({ ...value, value: num(e.target.value) })}
          placeholder="min"
          className="field"
          style={numberField}
        />
      )}

      {value.mode === "range" && (
        <>
          <input
            type="number"
            min={1}
            aria-label="From minutes"
            value={value.min ?? ""}
            onChange={(e) => onChange({ ...value, min: num(e.target.value) })}
            placeholder="from"
            className="field"
            style={numberField}
          />
          <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>&ndash;</span>
          <input
            type="number"
            min={1}
            aria-label="To minutes"
            value={value.max ?? ""}
            onChange={(e) => onChange({ ...value, max: num(e.target.value) })}
            placeholder="to"
            className="field"
            style={numberField}
          />
        </>
      )}

      {value.mode !== "any" && (
        <label
          className="font-body flex items-center gap-2 w-full"
          style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}
        >
          <input
            type="checkbox"
            checked={value.includeNoDuration}
            onChange={(e) =>
              onChange({ ...value, includeNoDuration: e.target.checked })
            }
            style={{ accentColor: "var(--ds-accent)" }}
          />
          Include tasks with no time set
        </label>
      )}
    </div>
  );
}
