import { describe, expect, it } from "vitest";
import {
  BACKUP_MIN_TASKS,
  shouldRemindBackup,
  shouldShowInstallHint,
  type SafetyMeta,
} from "./safety";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-23T12:00:00Z");
const meta = (o: Partial<SafetyMeta> = {}): SafetyMeta => ({
  firstUseAt: NOW - 10 * DAY,
  lastBackupAt: null,
  backupSnoozedUntil: 0,
  installHintDismissed: false,
  persist: "unknown",
  ...o,
});

describe("shouldShowInstallHint", () => {
  const base = { ownTaskCount: 3, standalone: false, embedded: false, dismissed: false, canInstall: true };

  it("shows once someone has a few real tasks and could install", () => {
    expect(shouldShowInstallHint(base)).toBe(true);
  });

  it("stays quiet for newcomers, installed apps, embeds, dismissals, and browsers that can't install", () => {
    expect(shouldShowInstallHint({ ...base, ownTaskCount: 2 })).toBe(false);
    expect(shouldShowInstallHint({ ...base, standalone: true })).toBe(false);
    expect(shouldShowInstallHint({ ...base, embedded: true })).toBe(false);
    expect(shouldShowInstallHint({ ...base, dismissed: true })).toBe(false);
    expect(shouldShowInstallHint({ ...base, canInstall: false })).toBe(false);
  });
});

describe("shouldRemindBackup", () => {
  const n = BACKUP_MIN_TASKS;

  it("reminds after a week of use without any backup", () => {
    expect(shouldRemindBackup({ ownTaskCount: n, meta: meta(), embedded: false, now: NOW })).toBe(true);
    expect(
      shouldRemindBackup({ ownTaskCount: n, meta: meta({ firstUseAt: NOW - 6 * DAY }), embedded: false, now: NOW })
    ).toBe(false);
  });

  it("then only when the last backup is a month old", () => {
    const recent = meta({ lastBackupAt: NOW - 29 * DAY });
    const old = meta({ lastBackupAt: NOW - 31 * DAY });
    expect(shouldRemindBackup({ ownTaskCount: n, meta: recent, embedded: false, now: NOW })).toBe(false);
    expect(shouldRemindBackup({ ownTaskCount: n, meta: old, embedded: false, now: NOW })).toBe(true);
  });

  it("respects 'Later', small lists and embeds", () => {
    expect(
      shouldRemindBackup({ ownTaskCount: n, meta: meta({ backupSnoozedUntil: NOW + DAY }), embedded: false, now: NOW })
    ).toBe(false);
    expect(shouldRemindBackup({ ownTaskCount: n - 1, meta: meta(), embedded: false, now: NOW })).toBe(false);
    expect(shouldRemindBackup({ ownTaskCount: n, meta: meta(), embedded: true, now: NOW })).toBe(false);
  });
});
