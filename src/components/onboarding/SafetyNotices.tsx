import { useEffect, useReducer, useRef } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useInstallStore } from "@/store/installStore";
import { isExampleTask } from "@/data/exampleTasks";
import { isEmbedded, isIOS, isStandalone, usesLocalStorage } from "@/lib/platform";
import {
  BACKUP_SNOOZE,
  readMeta,
  requestPersistentStorage,
  shouldRemindBackup,
  shouldShowInstallHint,
  updateMeta,
} from "@/lib/safety";
import { downloadBackup } from "@/utils/exportImport";
import { Button } from "@/components/ui/button";

function Card({ icon, children, actions }: { icon: React.ReactNode; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <section
      role="note"
      className="panel animate-fade-up"
      style={{ padding: 16, marginBottom: 16, borderLeft: "3px solid var(--ds-accent)" }}
    >
      <div className="flex gap-3">
        <span style={{ color: "var(--ds-accent)", marginTop: 2 }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {children}
          </div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
            {actions}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Browser-only build: tasks exist in this browser alone, and browsers may
 * clear site data (Safari after 7 days without a visit, unless the site is on
 * the Home Screen). This asks for persistent storage, nudges people to install,
 * and reminds them to keep a backup. Shows at most one card at a time.
 */
export function SafetyNotices() {
  const isLoaded = useActivityStore((s) => s.isLoaded);
  const activities = useActivityStore((s) => s.activities);
  const categories = useCategoryStore((s) => s.categories);
  const installPrompt = useInstallStore((s) => s.prompt);
  const install = useInstallStore((s) => s.install);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const asked = useRef(false);

  const embedded = isEmbedded();
  const ownTaskCount = activities.filter((a) => !isExampleTask(a)).length;
  const meta = readMeta(); // cheap; re-read so Settings' export is seen here too

  // Ask once per visit, as soon as there is something of the user's to keep.
  useEffect(() => {
    if (!usesLocalStorage || embedded || asked.current || ownTaskCount === 0) return;
    if (readMeta().persist === "granted") return;
    asked.current = true;
    requestPersistentStorage();
  }, [embedded, ownTaskCount]);

  if (!usesLocalStorage || !isLoaded || embedded) return null;

  const ios = isIOS();
  if (
    shouldShowInstallHint({
      ownTaskCount,
      standalone: isStandalone(),
      embedded,
      dismissed: meta.installHintDismissed,
      canInstall: ios || !!installPrompt,
    })
  ) {
    const dismiss = () => {
      updateMeta({ installHintDismissed: true });
      rerender();
    };
    return ios ? (
      <Card
        icon={<Smartphone size={18} />}
        actions={<Button size="sm" onClick={dismiss}>Got it</Button>}
      >
        <strong style={{ fontWeight: 500 }}>Keep your tasks on this iPhone.</strong> Safari can erase a
        site's data if you don't open it for 7 days. Tap <strong style={{ fontWeight: 500 }}>Share</strong>, then{" "}
        <strong style={{ fontWeight: 500 }}>Add to Home Screen</strong>, and done. keeps them.
      </Card>
    ) : (
      <Card
        icon={<Smartphone size={18} />}
        actions={
          <>
            <Button
              size="sm"
              onClick={async () => {
                if (await install()) {
                  updateMeta({ installHintDismissed: true });
                  requestPersistentStorage().then(rerender);
                }
                rerender();
              }}
            >
              Install app
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </>
        }
      >
        <strong style={{ fontWeight: 500 }}>Install done.</strong> so it opens like an app and your tasks
        stay safe on this device.
      </Card>
    );
  }

  if (shouldRemindBackup({ ownTaskCount, meta, embedded })) {
    return (
      <Card
        icon={<Download size={18} />}
        actions={
          <>
            <Button
              size="sm"
              onClick={() => {
                downloadBackup(activities, categories);
                toast("Backup downloaded.");
                rerender();
              }}
            >
              Download backup
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                updateMeta({ backupSnoozedUntil: Date.now() + BACKUP_SNOOZE });
                rerender();
              }}
            >
              Later
            </Button>
          </>
        }
      >
        <strong style={{ fontWeight: 500 }}>Your {ownTaskCount} tasks live only in this browser.</strong> A
        backup is one small file you can import on any device.
      </Card>
    );
  }

  return null;
}
