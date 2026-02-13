import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { getShuffleCandidates, shuffleSelect } from "@/utils/shuffle";
import { TimeFilterControl } from "./TimeFilterControl";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-lg border border-border p-4 mb-6 bg-card">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          value={scope}
          onChange={(e) => {
            setScope(e.target.value as ShuffleScope);
            setSelectedCategoryIds([]);
          }}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm h-8"
        >
          <option value="all">All Categories</option>
          <option value="single">Single Category</option>
          <option value="multi">Multiple Categories</option>
          <option value="unassigned">Unassigned Only</option>
        </select>

        {scope === "single" && (
          <select
            value={selectedCategoryIds[0] ?? ""}
            onChange={(e) => setSelectedCategoryIds([e.target.value])}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm h-8"
          >
            <option value="">Pick a category...</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        )}

        {scope === "multi" && (
          <div className="flex flex-wrap gap-1">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCategoryId(c.id)}
                className="rounded-full px-2 py-0.5 text-xs border transition-colors"
                style={{
                  backgroundColor: selectedCategoryIds.includes(c.id)
                    ? c.color + "30"
                    : "transparent",
                  borderColor: selectedCategoryIds.includes(c.id)
                    ? c.color
                    : "var(--border)",
                  color: selectedCategoryIds.includes(c.id)
                    ? c.color
                    : "inherit",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <TimeFilterControl value={timeFilter} onChange={setTimeFilter} />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleShuffle}
          disabled={candidates.length === 0}
          className="font-bold text-lg px-6 py-2"
          size="lg"
        >
          SHUFFLE!
        </Button>
        <span className="text-sm text-muted-foreground">
          {candidates.length === 0
            ? "No activities match! Try adjusting your filters or adding more tasks."
            : `${candidates.length} task${candidates.length !== 1 ? "s" : ""} to shuffle from`}
        </span>
      </div>
    </div>
  );
}
