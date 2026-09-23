import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryDot } from "@/components/categories/CategoryBadge";
import { parseQuickAdd } from "@/utils/quickAdd";

const MINUTE_PRESETS = [5, 15, 30, 60];

/**
 * One full-width field. Minutes and category only appear while you're adding
 * a task, so the row never has to fit four controls on a phone.
 */
export function QuickAddForm() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [categoryId, setCategoryId] = useState("unassigned");
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const addActivity = useActivityStore((s) => s.addActivity);
  const categories = useCategoryStore((s) => s.categories)
    .filter((c) => !c.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Typed shorthand ("30m", "#school") wins over the buttons below.
  const parsed = parseQuickAdd(name, categories);
  const hasShorthand = parsed.durationMinutes !== null || parsed.categoryId !== null;
  const previewCategory = categories.find((c) => c.id === parsed.categoryId);

  const expanded =
    focused || name.trim() !== "" || duration !== "" || categoryId !== "unassigned";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const picked = duration ? parseInt(duration, 10) : null;
    addActivity(
      parsed.name,
      parsed.durationMinutes ?? (picked && !isNaN(picked) ? picked : null),
      parsed.categoryId ?? categoryId
    );
    setName("");
    setDuration("");
    setCategoryId("unassigned");
  };

  // Collapse only once focus has really left the form. The short delay lets a
  // tap on a minute chip land before the options row is removed (on touch the
  // input blurs before the chip's click fires).
  const handleBlur = () => {
    window.setTimeout(() => {
      if (!formRef.current?.contains(document.activeElement)) setFocused(false);
    }, 150);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      style={{ marginBottom: 28 }}
    >
      <div className="flex gap-2">
        <input
          id="quick-add-input"
          placeholder="Add a task…"
          aria-label="New task"
          aria-keyshortcuts="N"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="quick-input flex-1 min-w-0"
        />
        <button
          type="submit"
          className="quick-add-btn"
          aria-label="Add task"
          disabled={!name.trim()}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {hasShorthand && (
        <p
          className="font-body flex items-center flex-wrap gap-x-2"
          aria-live="polite"
          style={{ fontSize: 12, color: "var(--ink-muted)", margin: "8px 0 0 4px" }}
        >
          <span>Adds “{parsed.name}”</span>
          {parsed.durationMinutes !== null && <span>· {parsed.durationMinutes} min</span>}
          {previewCategory && (
            <span className="inline-flex items-center gap-1.5">
              · <CategoryDot color={previewCategory.color} size={7} /> {previewCategory.name}
            </span>
          )}
        </p>
      )}

      {expanded && !hasShorthand && (
        <div
          className="flex flex-wrap items-center gap-1.5 animate-task-in"
          style={{ marginTop: 10 }}
        >
          {MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={duration === String(m)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setDuration(duration === String(m) ? "" : String(m))}
            >
              {m}m
            </button>
          ))}
          <input
            type="number"
            min={1}
            placeholder="min"
            aria-label="Minutes"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="field"
            style={{ width: 64, height: 28, fontSize: 12 }}
          />
          <select
            value={categoryId}
            aria-label="Category"
            onChange={(e) => setCategoryId(e.target.value)}
            className="field"
            style={{ height: 28, fontSize: 12, marginLeft: "auto" }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!name && (
            <span className="font-body w-full" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
              Tip: type <kbd>30m</kbd> or <kbd>#{categories.find((c) => c.id !== "unassigned")?.name.toLowerCase() ?? "school"}</kbd> right in the name.
            </span>
          )}
        </div>
      )}
    </form>
  );
}
