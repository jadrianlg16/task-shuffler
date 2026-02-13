import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <Input
        placeholder="Add a task..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="min"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-20"
        min={1}
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
      </select>
      <Button type="submit" size="sm">
        +
      </Button>
    </form>
  );
}
