import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";

export function QuickAddForm() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [categoryId, setCategoryId] = useState("unassigned");
  const addActivity = useActivityStore((s) => s.addActivity);
  const categories = useCategoryStore((s) => s.categories).filter(
    (c) => !c.isHidden
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const dur = duration ? parseInt(duration, 10) : null;
    addActivity(trimmed, dur && !isNaN(dur) ? dur : null, categoryId);
    setName("");
    setDuration("");
    setCategoryId("unassigned");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" style={{ marginBottom: 28 }}>
      <input
        placeholder="Add a task..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="font-body flex-1"
        style={{
          height: 48,
          borderRadius: 12,
          padding: "0 16px",
          fontSize: 14,
          background: "var(--surface)",
          border: "1.5px solid var(--ink-faint)",
          color: "var(--ink)",
          outline: "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--ds-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--ink-faint)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <input
        type="number"
        placeholder="min"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        min={1}
        className="font-body"
        style={{
          width: 64,
          height: 48,
          borderRadius: 12,
          padding: "0 12px",
          fontSize: 14,
          background: "var(--surface)",
          border: "1.5px solid var(--ink-faint)",
          color: "var(--ink)",
          outline: "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--ds-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--ink-faint)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="font-body"
        style={{
          height: 48,
          borderRadius: 12,
          padding: "0 10px",
          fontSize: 13,
          background: "var(--surface)",
          border: "1.5px solid var(--ink-faint)",
          color: "var(--ink)",
          outline: "none",
        }}
      >
        {categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <button
        type="submit"
        aria-label="Add task"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--ds-accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s ease, transform 0.15s ease",
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </form>
  );
}
