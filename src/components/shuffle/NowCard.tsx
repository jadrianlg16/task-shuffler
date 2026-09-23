import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { Button } from "@/components/ui/button";

const minutesSince = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));

/** The task you started. Pinned above the picker until you finish or drop it. */
export function NowCard() {
  const current = useActivityStore((s) =>
    s.activities.find((a) => a.status === "active" && a.startedAt)
  );
  const completeActivity = useActivityStore((s) => s.completeActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const dropActivity = useActivityStore((s) => s.dropActivity);
  const category = useCategoryStore((s) =>
    s.categories.find((c) => c.id === current?.categoryId)
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!current) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [current]);

  if (!current?.startedAt) return null;

  const elapsed = minutesSince(current.startedAt, now);
  const planned = current.durationMinutes;
  const over = planned ? elapsed - planned : 0;
  const elapsedText =
    elapsed === 0
      ? "Just started"
      : planned
        ? over > 0
          ? `${over} min over`
          : `${elapsed} of ${planned} min`
        : `${elapsed} min in`;

  const handleDone = () => {
    const { id, startedAt } = current;
    completeActivity(id);
    toast("Task done.", {
      action: {
        label: "Undo",
        onClick: () =>
          updateActivity(id, { status: "active", completedAt: null, startedAt }),
      },
      duration: 4000,
    });
  };

  return (
    <section
      className="panel animate-fade-up"
      aria-label="Now"
      style={{ padding: 20, marginBottom: 16, borderLeft: "3px solid var(--ds-accent)" }}
    >
      <div className="flex items-center justify-between">
        <span className="section-label" style={{ color: "var(--ds-accent)" }}>
          Now
        </span>
        <span className="font-body" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          {elapsedText}
        </span>
      </div>
      <h2
        className="font-display"
        style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.3, margin: "10px 0 6px" }}
      >
        {current.name}
      </h2>
      <div
        className="flex items-center gap-3 font-body"
        style={{ fontSize: 12, color: "var(--ink-muted)" }}
      >
        {planned && <span>{planned} min</span>}
        {category && <CategoryBadge category={category} />}
      </div>
      {planned && (
        <div
          className="progress-track"
          style={{ marginTop: 14 }}
          role="progressbar"
          aria-label="Time used"
          aria-valuenow={Math.min(100, Math.round((elapsed / planned) * 100))}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, (elapsed / planned) * 100)}%`,
              background: over > 0 ? "var(--ink-muted)" : undefined,
            }}
          />
        </div>
      )}
      <div className="flex gap-2" style={{ marginTop: 16 }}>
        <Button onClick={handleDone} className="h-10 rounded-xl flex-1">
          <Check strokeWidth={2.5} />
          Done
        </Button>
        <Button
          variant="ghost"
          onClick={() => dropActivity(current.id)}
          className="h-10 rounded-xl font-normal"
          style={{ color: "var(--ink-muted)" }}
          title="Stop without finishing; it goes back in the pool"
        >
          Drop
        </Button>
      </div>
    </section>
  );
}
