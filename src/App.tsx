import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/uiStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { QuickAddForm } from "@/components/activities/QuickAddForm";
import { ActivityListContainer } from "@/components/activities/ActivityListContainer";
import { ArchiveView } from "@/components/activities/ArchiveView";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { ShuffleControls } from "@/components/shuffle/ShuffleControls";
import { ShuffleOverlay } from "@/components/shuffle/ShuffleOverlay";
import { ShuffleResultScreen } from "@/components/shuffle/ShuffleResultScreen";
import type { Activity } from "@/types";

export default function App() {
  useTheme();
  const currentView = useUIStore((s) => s.currentView);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shuffleResult, setShuffleResult] = useState<{
    candidates: Activity[];
    winner: Activity;
  } | null>(null);
  const [manualSelection, setManualSelection] = useState<Activity | null>(null);

  return (
    <MainLayout>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      {currentView === "main" && (
        <>
          <ShuffleControls onShuffle={setShuffleResult} />
          <QuickAddForm />
          <ActivityListContainer onSelectActivity={setManualSelection} />
        </>
      )}
      {currentView === "archive" && <ArchiveView />}
      {shuffleResult && (
        <ShuffleOverlay
          candidates={shuffleResult.candidates}
          winner={shuffleResult.winner}
          onClose={() => setShuffleResult(null)}
        />
      )}
      {manualSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-lg p-6 w-full max-w-md mx-4">
            <ShuffleResultScreen
              winner={manualSelection}
              onShuffleAgain={() => setManualSelection(null)}
              onClose={() => setManualSelection(null)}
            />
          </div>
        </div>
      )}
      <CategoryManager
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <Toaster />
    </MainLayout>
  );
}
