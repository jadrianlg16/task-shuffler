import { useState } from "react";
import { Shuffle } from "lucide-react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useUIStore } from "@/store/uiStore";
import {
  getShuffleCandidates,
  shuffleSelect,
  suggestLoosening,
  TIME_PRESETS,
} from "@/utils/shuffle";
import { TimeFilterControl } from "./TimeFilterControl";
import { Button } from "@/components/ui/button";
import { CategoryDot } from "@/components/categories/CategoryBadge";
import type { Activity, TimeFilter } from "@/types";

const isSimple = (f: TimeFilter) =>
  f.mode === "any" || (f.mode === "max" && TIME_PRESETS.includes(f.value ?? -1));

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
      <span className="section-label shrink-0" style={{ width: 48, lineHeight: "28px" }}>
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ShuffleControls({
  onShuffle,
}: {
  onShuffle: (result: { candidates: Activity[]; winner: Activity }) => void;
}) {
  const activities = useActivityStore((s) => s.activities);
  const categories = useCategoryStore((s) => s.categories);
  const rememberedIds = useUIStore((s) => s.shuffleCategoryIds);
  const setCategoryIds = useUIStore((s) => s.setShuffleCategoryIds);
  const timeFilter = useUIStore((s) => s.shuffleTimeFilter);
  const setTimeFilter = useUIStore((s) => s.setShuffleTimeFilter);
  const [moreOpen, setMoreOpen] = useState(() => !isSimple(timeFilter));

  const visibleCategories = categories
    .filter((c) => !c.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  // A remembered pick may point at a category that was since hidden or deleted.
  const categoryIds = rememberedIds.filter((id) =>
    visibleCategories.some((c) => c.id === id)
  );

  const candidates = getShuffleCandidates(activities, categoryIds, timeFilter, categories);
  const loosening =
    candidates.length === 0
      ? suggestLoosening(activities, categoryIds, timeFilter, categories)
      : null;

  const handleShuffle = () => {
    const winner = shuffleSelect(candidates);
    if (winner) onShuffle({ candidates, winner });
  };

  const toggleCategory = (id: string) =>
    setCategoryIds(
      categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id]
    );

  const choosePreset = (minutes: number | null) => {
    setMoreOpen(false);
    setTimeFilter(
      minutes === null
        ? { ...timeFilter, mode: "any" }
        : { ...timeFilter, mode: "max", value: minutes }
    );
  };

  const presetPressed = (minutes: number | null) =>
    !moreOpen &&
    (minutes === null
      ? timeFilter.mode === "any"
      : timeFilter.mode === "max" && timeFilter.value === minutes);

  const n = candidates.length;

  return (
    <section className="panel" style={{ padding: 20, marginBottom: 28 }}>
      <div className="section-label" style={{ marginBottom: 14 }}>
        Pick for me
      </div>

      <Row label="I have">
        <button className="chip" aria-pressed={presetPressed(null)} onClick={() => choosePreset(null)}>
          Any
        </button>
        {TIME_PRESETS.map((m) => (
          <button
            key={m}
            className="chip"
            aria-pressed={presetPressed(m)}
            aria-label={`${m} minutes or less`}
            onClick={() => choosePreset(m)}
          >
            {m}m
          </button>
        ))}
        <button
          className="chip"
          aria-pressed={moreOpen}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          more…
        </button>
      </Row>

      {moreOpen && (
        <div style={{ margin: "-4px 0 12px 60px" }}>
          <TimeFilterControl value={timeFilter} onChange={setTimeFilter} />
        </div>
      )}

      {!moreOpen && timeFilter.mode !== "any" && (
        <label
          className="font-body flex items-center gap-2"
          style={{ fontSize: 12, color: "var(--ink-muted)", margin: "-4px 0 12px 60px" }}
        >
          <input
            type="checkbox"
            checked={timeFilter.includeNoDuration}
            onChange={(e) => setTimeFilter({ ...timeFilter, includeNoDuration: e.target.checked })}
            style={{ accentColor: "var(--ds-accent)" }}
          />
          Include tasks with no time set
        </label>
      )}

      <Row label="From">
        <button
          className="chip"
          aria-pressed={categoryIds.length === 0}
          onClick={() => setCategoryIds([])}
        >
          All
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            className="chip"
            aria-pressed={categoryIds.includes(c.id)}
            onClick={() => toggleCategory(c.id)}
          >
            <CategoryDot color={c.color} size={7} />
            {c.name}
          </button>
        ))}
      </Row>

      <Button
        id="shuffle-button"
        aria-keyshortcuts="S"
        title="Shuffle (S)"
        onClick={handleShuffle}
        disabled={n === 0}
        className="h-11 rounded-xl px-5 text-[15px] w-full sm:w-auto"
        style={{ marginTop: 4 }}
      >
        <Shuffle strokeWidth={2} />
        {n === 0 ? "Shuffle" : `Shuffle ${n} task${n !== 1 ? "s" : ""}`}
      </Button>

      {loosening && (
        <p
          className="font-body"
          role="status"
          style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 12 }}
        >
          {loosening.kind === "none-in-categories" ? (
            categoryIds.length === 0
              ? "No tasks to pick from yet. Add one below."
              : `No active tasks in ${categoryIds.length === 1 ? "that category" : "those categories"}.`
          ) : (
            <>
              Nothing fits.{" "}
              <button
                className="underline underline-offset-2"
                style={{ color: "var(--ds-accent)", fontWeight: 500 }}
                onClick={() => {
                  setMoreOpen(!isSimple(loosening.filter));
                  setTimeFilter(loosening.filter);
                }}
              >
                Try {loosening.label}
              </button>{" "}
              ({loosening.count} task{loosening.count !== 1 ? "s" : ""})
            </>
          )}
        </p>
      )}
    </section>
  );
}
