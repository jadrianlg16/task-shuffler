import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/uiStore";
import { useActivityStore } from "@/store/activityStore";
import { format, isToday } from "date-fns";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Header({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { theme, cycleTheme } = useTheme();
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const activities = useActivityStore((s) => s.activities);

  const activeCount = activities.filter((a) => a.status === "active").length;
  // "Today" framing: the bar fills as today's work gets done and resets tomorrow,
  // instead of an all-time ratio that stops moving after a week.
  const doneToday = activities.filter(
    (a) => a.status === "archived" && a.completedAt && isToday(new Date(a.completedAt))
  ).length;
  const todayTotal = activeCount + doneToday;
  const progressPercent = todayTotal > 0 ? (doneToday / todayTotal) * 100 : 0;

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header style={{ marginBottom: 40 }}>
      {/* Theme toggle — fixed top right */}
      <button
        className="theme-toggle fixed z-50"
        style={{ top: 28, right: 28, color: "var(--ink)" }}
        onClick={cycleTheme}
        aria-label="Toggle theme"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Wordmark */}
      <h1
        className="font-display cursor-pointer"
        style={{ fontSize: 32, fontWeight: 400, margin: 0, lineHeight: 1.2 }}
        onClick={() => setCurrentView("main")}
      >
        done<span className="font-display italic">.</span>
      </h1>

      {/* Date line */}
      <p
        className="font-body"
        style={{ fontSize: 13, fontWeight: 300, color: "var(--ink-muted)", marginTop: 6 }}
      >
        {format(new Date(), "EEEE, MMMM d")}
      </p>

      {/* Stats */}
      <div className="flex items-baseline gap-8" style={{ marginTop: 32 }}>
        <div>
          <span className="font-display" style={{ fontSize: 28, fontWeight: 700 }}>
            {activeCount}
          </span>
          <span
            className="font-body uppercase"
            style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 8, letterSpacing: "0.06em" }}
          >
            Active
          </span>
        </div>
        <div>
          <span className="font-display" style={{ fontSize: 28, fontWeight: 700 }}>
            {doneToday}
          </span>
          <span
            className="font-body uppercase"
            style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 8, letterSpacing: "0.06em" }}
          >
            Done today
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="progress-track"
        style={{ marginTop: 32 }}
        role="progressbar"
        aria-label="Done today"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Navigation row */}
      <nav className="flex items-center gap-2" style={{ marginTop: 16 }}>
        <button
          className="nav-tab"
          aria-current={currentView === "main"}
          onClick={() => setCurrentView("main")}
        >
          Tasks
        </button>
        <button
          className="nav-tab"
          aria-current={currentView === "archive"}
          onClick={() => setCurrentView("archive")}
        >
          Archive
        </button>
        <button
          className="nav-tab"
          style={{ marginLeft: "auto" }}
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>
    </header>
  );
}
