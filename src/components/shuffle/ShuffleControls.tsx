import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { getShuffleCandidates, shuffleSelect } from "@/utils/shuffle";
import { TimeFilterControl } from "./TimeFilterControl";
import { Button } from "@/components/ui/button";
import { CategoryDot } from "@/components/categories/CategoryBadge";
import { Shuffle } from "lucide-react";
import type { Activity, ShuffleScope, TimeFilter } from "@/types";

export function ShuffleControls({
  onShuffle,
}: {
  onShuffle: (result: { candidates: Activity[]; winner: Activity }) => void;
}) {
  const [scope, setScope] = useState<ShuffleScope>("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({
    mode: "any",
    includeNoDuration: true,
  });

  const activities = useActivityStore((s) => s.activities);
  const categories = useCategoryStore((s) => s.categories);
  const visibleCategories = categories
    .filter((c) => !c.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const candidates = getShuffleCandidates(
    activities,
    scope,
    selectedCategoryIds,
    timeFilter,
    categories
  );

  const handleShuffle = () => {
    const winner = shuffleSelect(candidates);
    if (winner) {
      onShuffle({ candidates, winner });
    }
  };

  const toggleCategoryId = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <section className="panel" style={{ padding: 20, marginBottom: 28 }}>
      <div className="section-label" style={{ marginBottom: 12 }}>
        Pick for me
      </div>

      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 10 }}>
        <select
          value={scope}
          aria-label="Shuffle from"
          onChange={(e) => {
            setScope(e.target.value as ShuffleScope);
            setSelectedCategoryIds([]);
          }}
          className="field"
        >
          <option value="all">All categories</option>
          <option value="single">One category</option>
          <option value="multi">Several categories</option>
          <option value="unassigned">Unassigned only</option>
        </select>

        {scope === "single" && (
          <select
            value={selectedCategoryIds[0] ?? ""}
            aria-label="Category"
            onChange={(e) => setSelectedCategoryIds([e.target.value])}
            className="field"
          >
            <option value="">Pick a category…</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {scope === "multi" && (
        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 10 }}>
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              className="chip"
              aria-pressed={selectedCategoryIds.includes(c.id)}
              onClick={() => toggleCategoryId(c.id)}
            >
              <CategoryDot color={c.color} size={7} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <TimeFilterControl value={timeFilter} onChange={setTimeFilter} />

      <div className="flex items-center gap-4" style={{ marginTop: 18 }}>
        <Button
          onClick={handleShuffle}
          disabled={candidates.length === 0}
          className="h-11 rounded-xl px-5 text-[15px]"
        >
          <Shuffle strokeWidth={2} />
          Shuffle
        </Button>
        <span className="font-body" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
          {candidates.length === 0
            ? "No tasks match. Loosen the filters or add one."
            : `${candidates.length} task${candidates.length !== 1 ? "s" : ""} in the pool`}
        </span>
      </div>
    </section>
  );
}
