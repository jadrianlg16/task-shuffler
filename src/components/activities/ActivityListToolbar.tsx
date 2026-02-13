import { useUIStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ActivityListToolbar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const sortBy = useUIStore((s) => s.sortBy);
  const setSortBy = useUIStore((s) => s.setSortBy);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-2 mb-4">
      <Input
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 h-8"
      />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8"
      >
        <option value="date">Newest</option>
        <option value="name">Name</option>
        <option value="duration">Duration</option>
        <option value="category">Category</option>
      </select>
      <Button
        variant={viewMode === "grouped" ? "default" : "outline"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setViewMode("grouped")}
      >
        Group
      </Button>
      <Button
        variant={viewMode === "flat" ? "default" : "outline"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setViewMode("flat")}
      >
        List
      </Button>
    </div>
  );
}
