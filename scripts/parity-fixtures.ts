/**
 * Runs fixed inputs through the web app's logic and writes the answers to
 * ios/DoneCore/Tests/DoneCoreTests/Fixtures/parity.json. The Swift tests
 * (ParityTests.swift) must give the same answers, so the iPhone app and the
 * web app can't quietly disagree about what gets shuffled, parsed or imported.
 *
 *   npm run parity:fixtures              rewrite the file
 *   npm run parity:fixtures -- --check   exit 1 if the file is out of date
 *
 * Change the web logic → rerun this → the Swift tests show what to port.
 */

// Archive grouping works in local calendar days, so pin a zone. It must be set
// before any Date is made; Mexico City has no DST, so the answers are stable.
const TIME_ZONE = "America/Mexico_City";
process.env.TZ = TIME_ZONE;

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Activity, Category, TimeFilter } from "@/types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { makeExampleTasks } from "@/data/exampleTasks";
import { groupArchive } from "@/utils/archive";
import { exportData, parseImportData } from "@/utils/exportImport";
import { filterByCategories, filterBySearch, filterByTime, sortActivities } from "@/utils/filters";
import { matchCategory, parseQuickAdd } from "@/utils/quickAdd";
import {
  getShuffleCandidates,
  shuffleSelect,
  suggestLoosening,
  taskWeight,
  TIME_PRESETS,
} from "@/utils/shuffle";
import { shouldRemindBackup, type SafetyMeta } from "@/lib/safety";

if (Intl.DateTimeFormat().resolvedOptions().timeZone !== TIME_ZONE) {
  throw new Error(`Couldn't switch to ${TIME_ZONE}; archive answers would depend on this machine.`);
}

const OUT = fileURLToPath(
  new URL("../ios/DoneCore/Tests/DoneCoreTests/Fixtures/parity.json", import.meta.url)
);

const DAY = 86_400_000;
const NOW_ISO = "2026-09-22T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);
const daysAgo = (d: number) => new Date(NOW - d * DAY).toISOString();
const ids = (xs: Activity[]) => xs.map((a) => a.id);

// ---- Shared data ------------------------------------------------------------

const categories: Category[] = [
  ...DEFAULT_CATEGORIES.map((c) => (c.id === "hobby" ? { ...c, isHidden: true } : c)),
  { id: "x1", name: "Side Hustle", color: "#0EA5E9", icon: "", isDefault: false, isHidden: false, sortOrder: 6 },
];

const act = (
  id: string,
  name: string,
  durationMinutes: number | null,
  categoryId: string,
  o: Partial<Activity> = {}
): Activity => ({
  id,
  name,
  durationMinutes,
  categoryId,
  status: "active",
  createdAt: daysAgo(1),
  completedAt: null,
  ...o,
});

const activities: Activity[] = [
  act("a1", "Study for calculus exam", 90, "school", { createdAt: daysAgo(3) }),
  act("a2", "morning run", 45, "personal", { createdAt: daysAgo(0.5) }),
  act("a3", "Prepare client proposal", 40, "business", { createdAt: daysAgo(12) }),
  act("a4", "Practice guitar", 25, "hobby"),
  act("a5", "Read 20 pages", 30, "personal", { createdAt: daysAgo(40) }),
  act("a6", "Water the plants", 10, "personal", { startedAt: daysAgo(0.01) }),
  act("a7", "Sketch app wireframes", null, "hobby"),
  act("a8", "Review lecture notes", 60, "school", {
    status: "archived",
    completedAt: daysAgo(2),
    startedAt: null,
  }),
  act("a9", "Call mom", 15, "x1", { createdAt: daysAgo(7) }),
  act("a10", "apple pie recipe", null, "unassigned"),
  act("a11", "Banana bread", 15, "field", { createdAt: daysAgo(20) }),
  act("a12", "Écrire le rapport", 30, "business", { createdAt: daysAgo(2) }),
  act("a13", "Apple pie recipe", 20, "unassigned", { createdAt: daysAgo(1) }),
];

const F = (f: Partial<TimeFilter> & Pick<TimeFilter, "mode">): TimeFilter => ({
  includeNoDuration: true,
  ...f,
});

const timeFilters: TimeFilter[] = [
  F({ mode: "any" }),
  F({ mode: "any", includeNoDuration: false }),
  F({ mode: "max", value: 15 }),
  F({ mode: "max", value: 15, includeNoDuration: false }),
  F({ mode: "max" }), // no value = no limit
  F({ mode: "min", value: 40 }),
  F({ mode: "min", includeNoDuration: false }),
  F({ mode: "range", min: 20, max: 45, includeNoDuration: false }),
  F({ mode: "range", min: 60 }),
  F({ mode: "range", max: 15, includeNoDuration: false }),
  F({ mode: "exact", value: 30 }),
  F({ mode: "exact", value: 31, includeNoDuration: false }),
];

const categorySelections: string[][] = [
  [],
  ["personal"],
  ["hobby"], // hidden: nothing to shuffle
  ["x1", "school"],
  ["unassigned"],
  ["gone"],
];

// ---- Cases ------------------------------------------------------------------

const filterCases = {
  time: timeFilters.map((filter) => ({ filter, expected: ids(filterByTime(activities, filter)) })),
  categories: categorySelections.map((categoryIds) => ({
    categoryIds,
    expected: ids(filterByCategories(activities, categoryIds)),
  })),
  search: ["re", "CALL", "", "   ", "é", "apple pie", "zzz"].map((query) => ({
    query,
    expected: ids(filterBySearch(activities, query)),
  })),
  sort: [
    ...(["name", "duration", "category", "date"] as const).map((sortBy) => ({
      sortBy,
      expected: ids(sortActivities(activities, sortBy, categories)),
    })),
    // A category listed twice: the later entry's order wins.
    (() => {
      const repeated = [...categories, { ...categories[0], sortOrder: 9 }];
      return { sortBy: "category", categories: repeated, expected: ids(sortActivities(activities, "category", repeated)) };
    })(),
  ],
};

const candidateCases = categorySelections.flatMap((categoryIds) =>
  timeFilters.map((filter) => ({
    categoryIds,
    filter,
    expected: ids(getShuffleCandidates(activities, categoryIds, filter, categories)),
  }))
);

const weightCases = [0, 0.5, 1, 7.25, 15, 29.999, 30, 45, 365, -2]
  .map((d) => daysAgo(d))
  .concat(["2026-09-01T10:00:00+05:30", "2026-08-23T12:00:00Z"])
  .map((createdAt) => ({
    createdAt,
    expected: taskWeight(act("w", "w", null, "school", { createdAt }), NOW),
  }));

function lcg(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const rng = lcg(7);
const randoms = [0, 0.5, 0.9999999, ...Array.from({ length: 60 }, rng)];
const selectPool = [
  act("new", "new", null, "school", { createdAt: daysAgo(0) }),
  act("week", "week", null, "school", { createdAt: daysAgo(7) }),
  act("fortnight", "fortnight", null, "school", { createdAt: daysAgo(14) }),
  act("month", "month", null, "school", { createdAt: daysAgo(30) }),
  act("year", "year", null, "school", { createdAt: daysAgo(365) }),
  act("future", "future", null, "school", { createdAt: daysAgo(-3) }),
];
const selectCases = {
  pool: selectPool,
  randoms,
  expected: randoms.map((r) => shuffleSelect(selectPool, () => r, NOW)?.id ?? null),
  emptyPoolExpected: shuffleSelect([], () => 0.5, NOW),
};

const looseningInputs: [string[], TimeFilter][] = [
  [["personal"], F({ mode: "max", value: 5, includeNoDuration: false })],
  [[], F({ mode: "max", value: 5, includeNoDuration: false })],
  [["hobby"], F({ mode: "any" })],
  [["gone"], F({ mode: "max", value: 15 })],
  [[], F({ mode: "any" })],
  [["school"], F({ mode: "min", value: 100, includeNoDuration: false })],
  [["x1"], F({ mode: "max", value: 90, includeNoDuration: false })],
  [["business"], F({ mode: "exact", value: 35 })],
  [[], F({ mode: "max", value: 90, includeNoDuration: false })],
  [["unassigned"], F({ mode: "max", value: 15, includeNoDuration: false })],
  [["school"], F({ mode: "max", includeNoDuration: false })],
];
const looseningCases = looseningInputs.map(([categoryIds, filter]) => ({
  categoryIds,
  filter,
  expected: suggestLoosening(activities, categoryIds, filter, categories),
}));

const quickAddInputs = [
  "Water the plants",
  "Read 30m",
  "Read 45 min",
  "Read 1h",
  "Read 1.5h",
  "Read 1h30",
  "Read 1h30m",
  "Read 1h 30m",
  "Read 2 hrs",
  "Read 90 minutes",
  "Read 1 hour",
  "Read 3 HOURS",
  "Read 1H",
  "Call mom #personal",
  "Invoice #SideHustle",
  "Invoice #side-hustle",
  "Invoice #SIDE_HUSTLE",
  "15m Call mom #personal",
  "#personal 15m Call mom",
  "Read chapter 5",
  "Buy 2m cable",
  "Email team2m",
  "Fix bug #urgent",
  "Fix bug #s",
  "Fix bug #sch",
  "Stretch #x1",
  "30m",
  "#personal",
  "30m #personal",
  "Pay 0m rent",
  "Nap 0.001h",
  "Meet at 3pm",
  "Walk 10m 20m",
  "Plan #personal #business",
  "Tag##personal",
  "Hash # alone",
  "  spaced   out   name  ",
  "Café au lait 5 min #personal",
  "🎸 practice 25m #hobby",
  "Tab\tseparated\t20m",
  "Trailing 20m ",
  "Long 1.25h",
  "Odd 0.5h",
  "Half 0.5 hours",
  "No space 45min#personal",
  "",
  // Whitespace JavaScript's \s knows and ICU's doesn't, and the other way round.
  "Read﻿30m",
  "Read30m #personal",
  "Read30m",
  "Read 30m",
  "﻿ Padded name 　",
  "Read 30m",
  "Read 30m ",
];
const quickAddCases = quickAddInputs.map((input) => ({
  input,
  expected: parseQuickAdd(input, categories),
}));

const matchCases = ["sch", "s", "PERSONAL", "side_hustle", "unassigned", "x1", "X1", "", "!!!", "bus", "b", "h", "f", "u", "per-son-al", "sidehustler"].map(
  (tag) => ({ tag, expected: matchCategory(tag, categories)?.id ?? null })
);

// ---- Import ----------------------------------------------------------------

const task = (o: Record<string, unknown> = {}) => ({
  id: "t1",
  name: "Read",
  durationMinutes: 30,
  categoryId: "school",
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  completedAt: null,
  ...o,
});
const backup = (acts: unknown[], cats: unknown[] = DEFAULT_CATEGORIES) =>
  JSON.stringify({ activities: acts, categories: cats });
const withoutKey = (o: Record<string, unknown>, key: string) => {
  const copy = { ...o };
  delete copy[key];
  return copy;
};
const catWithout = (key: string) =>
  DEFAULT_CATEGORIES.map((c) => (c.id === "school" ? withoutKey(c, key) : c));
const catWith = (o: Record<string, unknown>) =>
  DEFAULT_CATEGORIES.map((c) => (c.id === "school" ? { ...c, ...o } : c));

const importInputs: [string, string][] = [
  ["round trip", exportData([task() as Activity, task({ id: "t2", durationMinutes: null, startedAt: "2026-09-02T10:00:00.000Z" }) as Activity], DEFAULT_CATEGORIES)],
  ["examples", exportData(makeExampleTasks(NOW), DEFAULT_CATEGORIES)],
  ["not json", "not json"],
  ["empty string", ""],
  ["null", "null"],
  ["number", "42"],
  ["array", "[]"],
  ["no lists", '{"tasks": []}'],
  ["activities not a list", JSON.stringify({ activities: {}, categories: DEFAULT_CATEGORIES })],
  ["no categories", backup([], [])],
  ["bad status", backup([task(), task({ id: "t2", status: "done" })])],
  ["zero minutes", backup([task({ durationMinutes: 0 })])],
  ["negative minutes", backup([task({ durationMinutes: -5 })])],
  ["minutes as text", backup([task({ durationMinutes: "30" })])],
  ["minutes missing", backup([withoutKey(task(), "durationMinutes")])],
  ["minutes true", backup([task({ durationMinutes: true })])],
  ["empty id", backup([task({ id: "" })])],
  ["empty name", backup([task({ name: "" })])],
  ["name missing", backup([withoutKey(task(), "name")])],
  ["empty categoryId", backup([task({ categoryId: "" })])],
  ["createdAt missing", backup([withoutKey(task(), "createdAt")])],
  ["completedAt missing", backup([withoutKey(task(), "completedAt")])],
  ["completedAt number", backup([task({ completedAt: 5 })])],
  ["startedAt missing", backup([task()])],
  ["startedAt null", backup([task({ startedAt: null })])],
  ["startedAt number", backup([task({ startedAt: 1 })])],
  ["task is null", backup([null])],
  ["task is a string", backup(["t1"])],
  ["archived task", backup([task({ status: "archived", completedAt: "2026-09-03T08:00:00.000Z" })])],
  ["unknown category", backup([task({ categoryId: "gone" })])],
  ["extra fields", backup([task({ colour: "red" })], catWith({ emoji: "📚" }))],
  ["category without icon", backup([task()], catWithout("icon"))],
  ["category without isDefault", backup([task()], catWithout("isDefault"))],
  ["category without isHidden", backup([task()], catWithout("isHidden"))],
  ["category isHidden as text", backup([task()], catWith({ isHidden: "true" }))],
  ["category short colour", backup([task()], catWith({ color: "#abc" }))],
  ["category bad colour", backup([task()], catWith({ color: "#GGG" }))],
  ["category colour name", backup([task()], catWith({ color: "blue" }))],
  ["category empty name", backup([task()], catWith({ name: "" }))],
  ["category sortOrder text", backup([task()], catWith({ sortOrder: "1" }))],
  ["category is null", backup([task()], [...DEFAULT_CATEGORIES, null])],
  ["bad task and bad category", backup([task({ status: "done" })], catWith({ color: "blue" }))],
  ["no unassigned", backup([task()], DEFAULT_CATEGORIES.filter((c) => c.id !== "unassigned"))],
  ["duplicate task ids", backup([task(), task()])],
  ["duplicate category ids", backup([task()], [...DEFAULT_CATEGORIES, DEFAULT_CATEGORIES[0]])],
  ["empty activities", backup([])],
];
const importCases = importInputs.map(([label, json]) => {
  try {
    const out = parseImportData(json);
    // Normalise to exactly the fields both apps store (JS keeps unknown keys
    // and leaves a missing startedAt undefined).
    return {
      label,
      json,
      error: null,
      expected: {
        activities: out.activities.map((a) => ({
          id: a.id,
          name: a.name,
          durationMinutes: a.durationMinutes,
          categoryId: a.categoryId,
          status: a.status,
          createdAt: a.createdAt,
          completedAt: a.completedAt ?? null,
          startedAt: a.startedAt ?? null,
        })),
        categories: out.categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          isDefault: c.isDefault,
          isHidden: c.isHidden,
          sortOrder: c.sortOrder,
        })),
      },
    };
  } catch (err) {
    return { label, json, error: (err as Error).message, expected: null };
  }
});

// ---- Archive (local calendar days in TIME_ZONE) ----------------------------

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 8, day, hour, minute).toISOString();
const archiveNow = local(22, 15);
const doneAt = (id: string, completedAt: string | null): Activity =>
  act(id, id, null, "school", { status: "archived", completedAt, createdAt: local(1, 9) });
const archiveActivities: Activity[] = [
  doneAt("lastMonth", local(2, 10)),
  doneAt("thisMorning", local(22, 8)),
  doneAt("justAfterMidnight", local(22, 0, 30)),
  doneAt("lateYesterday", local(21, 23, 59)),
  doneAt("sixDaysAgo", local(16, 10)),
  doneAt("sevenDaysAgoMidnight", local(15, 0, 0)),
  doneAt("sameTimeA", local(20, 12)),
  doneAt("sameTimeB", local(20, 12)),
  doneAt("undated", null),
  doneAt("tomorrow", local(23, 9)),
  act("stillActive", "stillActive", null, "school"),
];
const archiveCases = [
  { now: archiveNow, activities: archiveActivities },
  { now: archiveNow, activities: [archiveActivities[8], archiveActivities[10]] },
  { now: archiveNow, activities: [] },
  { now: local(23, 0, 0), activities: archiveActivities },
].map(({ now, activities: list }) => ({
  now,
  activities: list,
  expected: groupArchive(list, new Date(now)).map((g) => ({ label: g.label, ids: ids(g.items) })),
}));

// ---- Backup reminder ---------------------------------------------------------

const reminderInputs: [label: string, ownTaskCount: number, firstUseAgo: number, lastBackupAgo: number | null, snoozedUntilFromNow: number | null][] = [
  ["a week of use, no backup", 5, 7 * DAY, null, null],
  ["just under a week", 5, 7 * DAY - 1, null, null],
  ["ten days, no backup", 5, 10 * DAY, null, null],
  ["too few tasks", 4, 10 * DAY, null, null],
  ["no tasks", 0, 100 * DAY, null, null],
  ["backup 29 days ago", 5, 100 * DAY, 29 * DAY, null],
  ["backup exactly 30 days ago", 5, 100 * DAY, 30 * DAY, null],
  ["backup 31 days ago", 5, 100 * DAY, 31 * DAY, null],
  ["snoozed until tomorrow", 5, 10 * DAY, null, DAY],
  ["snooze ends now", 5, 10 * DAY, null, 0],
  ["snooze ended yesterday", 5, 10 * DAY, 40 * DAY, -DAY],
];
const reminderCases = reminderInputs.map(([label, ownTaskCount, firstUseAgo, lastBackupAgo, snoozed]) => {
  const meta: SafetyMeta = {
    firstUseAt: NOW - firstUseAgo,
    lastBackupAt: lastBackupAgo === null ? null : NOW - lastBackupAgo,
    backupSnoozedUntil: snoozed === null ? 0 : NOW + snoozed,
    installHintDismissed: false,
    persist: "unknown",
  };
  return {
    label,
    ownTaskCount,
    firstUseAt: new Date(meta.firstUseAt).toISOString(),
    lastBackupAt: meta.lastBackupAt === null ? null : new Date(meta.lastBackupAt).toISOString(),
    snoozedUntil: snoozed === null ? null : new Date(meta.backupSnoozedUntil).toISOString(),
    expected: shouldRemindBackup({ ownTaskCount, meta, embedded: false, now: NOW }),
  };
});

// ---- Dates -----------------------------------------------------------------

const dateParseCases = [
  "2026-09-22T12:00:00.000Z",
  "2026-09-22T12:00:00Z",
  "2026-09-22T12:00Z",
  "2026-09-22T12:00:00.5Z",
  "2026-09-22T12:00:00.12Z",
  "2026-09-22T12:00:00.123456Z",
  "2026-09-22T17:30:00+05:30",
  "2026-09-22T06:00:00-06:00",
  "2026-09-22T06:00:00.250-06:00",
  "2026-09-22",
  "2028-02-29T23:59:59.999Z",
  "1970-01-01T00:00:00.000Z",
  "1969-12-31T23:59:59.999Z",
  "not a date",
  "",
  "2026-13-01T00:00:00Z",
  "2026-09-22T25:00:00Z",
].map((input) => {
  const ms = Date.parse(input);
  return { input, ms: Number.isNaN(ms) ? null : ms };
});
const dateFormatCases = [0, -1, NOW, NOW + 7, Date.UTC(2028, 1, 29, 23, 59, 59, 999), Date.UTC(1999, 11, 31, 23, 59, 59, 1), Date.UTC(2100, 0, 1)].map(
  (ms) => ({ ms, expected: new Date(ms).toISOString() })
);

// ---- Write -----------------------------------------------------------------

const fixtures = {
  about: "Generated by scripts/parity-fixtures.ts from the web app's logic. Do not edit by hand.",
  timeZone: TIME_ZONE,
  now: NOW_ISO,
  timePresets: TIME_PRESETS,
  categories,
  activities,
  defaultCategories: DEFAULT_CATEGORIES,
  filters: filterCases,
  candidates: candidateCases,
  weights: weightCases,
  select: selectCases,
  loosening: looseningCases,
  quickAdd: quickAddCases,
  matchCategory: matchCases,
  import: importCases,
  archive: archiveCases,
  examples: makeExampleTasks(NOW),
  backupReminder: reminderCases,
  dates: { parse: dateParseCases, format: dateFormatCases },
};

const json = JSON.stringify(fixtures, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    /* missing counts as out of date */
  }
  if (current.replace(/\r\n/g, "\n") !== json) {
    console.error(`${OUT} is out of date. Run: npm run parity:fixtures`);
    process.exit(1);
  }
  console.log("Parity fixtures are up to date.");
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  const counts = Object.entries(fixtures)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${(v as unknown[]).length}`);
  console.log(`Wrote ${OUT}\n  ${counts.join(", ")}`);
}
