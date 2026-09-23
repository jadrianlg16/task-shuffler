/**
 * Keeping browser-only data safe. The rules are pure functions (tested in
 * safety.test.ts); the small bits of state they need live in localStorage.
 */

const DAY = 86_400_000;
export const INSTALL_HINT_MIN_TASKS = 3;
export const BACKUP_MIN_TASKS = 5;
/** First reminder once the app has been in use this long without a backup. */
export const FIRST_BACKUP_AFTER = 7 * DAY;
/** Later reminders once the last backup is this old. */
export const BACKUP_EVERY = 30 * DAY;
export const BACKUP_SNOOZE = 7 * DAY;

export type PersistStatus = "granted" | "denied" | "unsupported" | "unknown";

export type SafetyMeta = {
  firstUseAt: number;
  lastBackupAt: number | null;
  backupSnoozedUntil: number;
  installHintDismissed: boolean;
  persist: PersistStatus;
};

const META_KEY = "task-shuffler-meta";

export function readMeta(now = Date.now()): SafetyMeta {
  const fallback: SafetyMeta = {
    firstUseAt: now,
    lastBackupAt: null,
    backupSnoozedUntil: 0,
    installHintDismissed: false,
    persist: "unknown",
  };
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) {
      localStorage.setItem(META_KEY, JSON.stringify(fallback));
      return fallback;
    }
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback; // storage blocked (private mode etc.): behave as a first visit
  }
}

export function updateMeta(patch: Partial<SafetyMeta>): SafetyMeta {
  const next = { ...readMeta(), ...patch };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    /* nothing to do: the reminder just shows again next time */
  }
  return next;
}

/** Nudge someone who has started using the app to put it on the Home Screen / install it. */
export function shouldShowInstallHint(o: {
  ownTaskCount: number;
  standalone: boolean;
  embedded: boolean;
  dismissed: boolean;
  canInstall: boolean; // iOS (manual Add to Home Screen) or a captured install prompt
}): boolean {
  return (
    o.canInstall &&
    !o.standalone &&
    !o.embedded &&
    !o.dismissed &&
    o.ownTaskCount >= INSTALL_HINT_MIN_TASKS
  );
}

/** Remind to download a backup: first after a week of use, then monthly; "Later" snoozes a week. */
export function shouldRemindBackup(o: {
  ownTaskCount: number;
  meta: SafetyMeta;
  embedded: boolean;
  now?: number;
}): boolean {
  const now = o.now ?? Date.now();
  if (o.embedded || o.ownTaskCount < BACKUP_MIN_TASKS) return false;
  if (now < o.meta.backupSnoozedUntil) return false;
  return o.meta.lastBackupAt === null
    ? now - o.meta.firstUseAt >= FIRST_BACKUP_AFTER
    : now - o.meta.lastBackupAt >= BACKUP_EVERY;
}

/**
 * Ask the browser not to clear this site's storage under pressure or after
 * inactivity. Browsers may say no (they decide from engagement / install
 * state); the answer is recorded so Settings can show it.
 */
export async function requestPersistentStorage(): Promise<PersistStatus> {
  const storage = navigator.storage;
  if (!storage?.persist || !storage.persisted) return updateMeta({ persist: "unsupported" }).persist;
  try {
    const granted = (await storage.persisted()) || (await storage.persist());
    return updateMeta({ persist: granted ? "granted" : "denied" }).persist;
  } catch {
    return updateMeta({ persist: "denied" }).persist;
  }
}
