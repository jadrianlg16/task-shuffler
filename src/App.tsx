import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/uiStore";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { QuickAddForm } from "@/components/activities/QuickAddForm";
import { ActivityListContainer } from "@/components/activities/ActivityListContainer";
import { ArchiveView } from "@/components/activities/ArchiveView";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { ShuffleControls } from "@/components/shuffle/ShuffleControls";
import { ShuffleOverlay } from "@/components/shuffle/ShuffleOverlay";
import { ShuffleResultScreen } from "@/components/shuffle/ShuffleResultScreen";
import { PickDialog } from "@/components/shuffle/PickDialog";
import { NowCard } from "@/components/shuffle/NowCard";
import { MotionConfig } from "framer-motion";
import type { Activity } from "@/types";

export default function App() {
  useTheme();
  const currentView = useUIStore((s) => s.currentView);
  const loadActivities = useActivityStore((s) => s.loadActivities);
  const loadCategories = useCategoryStore((s) => s.loadCategories);

  useEffect(() => {
    loadActivities();
    loadCategories();
  }, [loadActivities, loadCategories]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shuffleResult, setShuffleResult] = useState<{
    candidates: Activity[];
    winner: Activity;
  } | null>(null);
  const [manualSelection, setManualSelection] = useState<Activity | null>(null);

  return (
    // Framer animations follow the OS "reduce motion" setting.
    <MotionConfig reducedMotion="user">
    <MainLayout>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      {currentView === "main" && (
        <>
          <NowCard />
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
        <PickDialog
          title={`Your next task: ${manualSelection.name}`}
          onClose={() => setManualSelection(null)}
        >
          <ShuffleResultScreen
            winner={manualSelection}
            onClose={() => setManualSelection(null)}
          />
        </PickDialog>
      )}
      <CategoryManager
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <Toaster />
    </MainLayout>
    </MotionConfig>
  );
}
