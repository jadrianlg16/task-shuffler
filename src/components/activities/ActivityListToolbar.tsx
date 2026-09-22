import { useUIStore } from "@/store/uiStore";

export function ActivityListToolbar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const sortBy = useUIStore((s) => s.sortBy);
  const setSortBy = useUIStore((s) => s.setSortBy);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-2 font-body" style={{ marginBottom: 20 }}>
      <input
        placeholder="Search…"
        aria-label="Search tasks"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="field flex-1 min-w-0"
      />
      <select
        value={sortBy}
        aria-label="Sort tasks"
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="field"
        style={{ color: "var(--ink-muted)" }}
      >
        <option value="date">Newest</option>
        <option value="name">Name</option>
        <option value="duration">Duration</option>
        <option value="category">Category</option>
      </select>
      <button
        className="nav-tab"
        aria-pressed={viewMode === "grouped"}
        onClick={() => setViewMode("grouped")}
      >
        Group
      </button>
      <button
        className="nav-tab"
        aria-pressed={viewMode === "flat"}
        onClick={() => setViewMode("flat")}
      >
        List
      </button>
    </div>
  );
}
