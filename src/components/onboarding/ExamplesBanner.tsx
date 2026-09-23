import { toast } from "sonner";
import { useActivityStore } from "@/store/activityStore";
import { isExampleTask } from "@/data/exampleTasks";
import { Button } from "@/components/ui/button";

/** Marks example tasks as examples, and clears them in one tap. */
export function ExamplesBanner() {
  const count = useActivityStore((s) => s.activities.filter(isExampleTask).length);
  const clearExamples = useActivityStore((s) => s.clearExamples);
  if (count === 0) return null;

  return (
    <div
      role="note"
      className="panel flex items-center gap-3 animate-fade-up"
      style={{ padding: "12px 16px", marginBottom: 16 }}
    >
      <p className="font-body flex-1" style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.45 }}>
        These are example tasks. Clear them when you're ready to add your own.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          clearExamples();
          toast("Examples cleared. Your own tasks are untouched.");
        }}
      >
        Clear examples
      </Button>
    </div>
  );
}
