import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/useTheme";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useUIStore } from "@/store/uiStore";
import { loadAll, useLoadStatus } from "@/store/loadAll";
import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { LoadError } from "@/components/layout/LoadError";
import { QuickAddForm } from "@/components/activities/QuickAddForm";
import { ActivityListContainer } from "@/components/activities/ActivityListContainer";
import { ArchiveView } from "@/components/activities/ArchiveView";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { ShuffleControls } from "@/components/shuffle/ShuffleControls";
import { ShuffleOverlay } from "@/components/shuffle/ShuffleOverlay";
import { ShuffleResultScreen } from "@/components/shuffle/ShuffleResultScreen";
import { PickDialog } from "@/components/shuffle/PickDialog";
import { NowCard } from "@/components/shuffle/NowCard";
import { ExamplesBanner } from "@/components/onboarding/ExamplesBanner";
import { SafetyNotices } from "@/components/onboarding/SafetyNotices";
import { MotionConfig } from "framer-motion";
import type { Activity } from "@/types";

export default function App() {
  useTheme();
  useShortcuts();
  const currentView = useUIStore((s) => s.currentView);
  const { ready, error } = useLoadStatus();

  useEffect(() => {
    void loadAll(); // failures surface through useLoadStatus, not as rejections
  }, []);
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
      {error ? (
        <LoadError message={error} />
      ) : !ready ? (
        <p className="load-pending font-body" role="status" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
          Loading your tasks…
        </p>
      ) : currentView === "main" ? (
        <>
          <SafetyNotices />
          <ExamplesBanner />
          <NowCard />
          <ShuffleControls onShuffle={setShuffleResult} />
          <QuickAddForm />
          <ActivityListContainer onSelectActivity={setManualSelection} />
        </>
      ) : (
        <ArchiveView />
      )}
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
