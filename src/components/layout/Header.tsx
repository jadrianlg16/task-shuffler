import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";

export function Header({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { theme, cycleTheme } = useTheme();
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const themeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto";

  return (
    <header className="flex items-center justify-between mb-6">
      <h1
        className="text-2xl font-bold cursor-pointer"
        onClick={() => setCurrentView("main")}
      >
        Task Shuffler
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant={currentView === "archive" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setCurrentView(currentView === "archive" ? "main" : "archive")
          }
        >
          Archive
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          Settings
        </Button>
        <Button variant="outline" size="sm" onClick={cycleTheme}>
          {themeLabel}
        </Button>
      </div>
    </header>
  );
}
