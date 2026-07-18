import { useUIStore } from "@/store/uiStore";

const tabStyle = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 13,
  fontWeight: active ? 500 : 400,
  background: active ? "var(--surface)" : "transparent",
  color: active ? "var(--ink)" : "var(--ink-muted)",
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: active ? "var(--shadow-card)" : "none",
});

export function ActivityListToolbar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const sortBy = useUIStore((s) => s.sortBy);
  const setSortBy = useUIStore((s) => s.setSortBy);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-2 font-body" style={{ marginBottom: 16 }}>
      <input
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="font-body flex-1"
        style={{
          height: 34,
          borderRadius: 8,
          padding: "0 12px",
          fontSize: 13,
          background: "transparent",
          border: "1px solid var(--ink-faint)",
          color: "var(--ink)",
          outline: "none",
        }}
      />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="font-body"
        style={{
          height: 34,
          borderRadius: 8,
          padding: "0 8px",
          fontSize: 13,
          background: "transparent",
          border: "1px solid var(--ink-faint)",
          color: "var(--ink-muted)",
          outline: "none",
        }}
      >
        <option value="date">Newest</option>
        <option value="name">Name</option>
        <option value="duration">Duration</option>
        <option value="category">Category</option>
      </select>
      <button
        className="font-body"
        style={tabStyle(viewMode === "grouped")}
        onClick={() => setViewMode("grouped")}
      >
        Group
      </button>
      <button
        className="font-body"
        style={tabStyle(viewMode === "flat")}
        onClick={() => setViewMode("flat")}
      >
        List
      </button>
    </div>
  );
}
