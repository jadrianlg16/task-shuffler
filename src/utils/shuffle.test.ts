import { describe, expect, it } from "vitest";
import type { Activity, Category, TimeFilter } from "@/types";
import {
  getShuffleCandidates,
  shuffleSelect,
  suggestLoosening,
  taskWeight,
} from "./shuffle";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const act = (id: string, o: Partial<Activity> = {}): Activity => ({
  id,
  name: id,
  durationMinutes: null,
  categoryId: "school",
  status: "active",
  createdAt: daysAgo(0),
  completedAt: null,
  ...o,
});

const cat = (id: string, isHidden = false): Category => ({
  id,
  name: id,
  color: "#000000",
  icon: "",
  isDefault: true,
  isHidden,
  sortOrder: 0,
});

const cats = [cat("school"), cat("hobby", true), cat("unassigned")];
const any: TimeFilter = { mode: "any", includeNoDuration: true };
const ids = (xs: Activity[]) => xs.map((a) => a.id).sort();

// Deterministic RNG so the distribution test is stable.
function lcg(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe("taskWeight", () => {
  it("grows linearly from 1 (new) to 3 (30+ days), then caps", () => {
    expect(taskWeight(act("a"), NOW)).toBe(1);
    expect(taskWeight(act("a", { createdAt: daysAgo(15) }), NOW)).toBeCloseTo(2);
    expect(taskWeight(act("a", { createdAt: daysAgo(30) }), NOW)).toBeCloseTo(3);
    expect(taskWeight(act("a", { createdAt: daysAgo(90) }), NOW)).toBe(3);
  });

  it("treats a future createdAt (clock skew) as new", () => {
    expect(taskWeight(act("a", { createdAt: daysAgo(-2) }), NOW)).toBe(1);
  });
});

describe("shuffleSelect", () => {
  it("returns null for an empty pool", () => {
    expect(shuffleSelect([], Math.random, NOW)).toBeNull();
  });

  it("picks a 30-day-old task ~3x as often as a new one", () => {
    const pool = [act("new"), act("old", { createdAt: daysAgo(30) })];
    const rng = lcg(42);
    const n = 100_000;
    let old = 0;
    for (let i = 0; i < n; i++) if (shuffleSelect(pool, rng, NOW)!.id === "old") old++;
    expect(old / n).toBeGreaterThan(0.74);
    expect(old / n).toBeLessThan(0.76);
  });
});

describe("getShuffleCandidates", () => {
  const acts = [
    act("t1", { durationMinutes: 10 }),
    act("t2", { durationMinutes: 45 }),
    act("started", { durationMinutes: 10, startedAt: daysAgo(0) }),
    act("hiddenCat", { categoryId: "hobby", durationMinutes: 10 }),
    act("archived", { status: "archived", durationMinutes: 10 }),
    act("un", { categoryId: "unassigned" }),
  ];

  it("excludes the task in progress, hidden categories and archived tasks", () => {
    expect(ids(getShuffleCandidates(acts, [], any, cats))).toEqual(["t1", "t2", "un"]);
  });

  it("narrows to picked categories (none picked = all)", () => {
    expect(ids(getShuffleCandidates(acts, ["unassigned"], any, cats))).toEqual(["un"]);
  });

  it("applies 'I have N minutes', optionally keeping untimed tasks", () => {
    const fifteen: TimeFilter = { mode: "max", value: 15, includeNoDuration: true };
    expect(ids(getShuffleCandidates(acts, [], fifteen, cats))).toEqual(["t1", "un"]);
    expect(
      ids(getShuffleCandidates(acts, [], { ...fifteen, includeNoDuration: false }, cats))
    ).toEqual(["t1"]);
  });
});

describe("suggestLoosening", () => {
  const acts = [
    act("short", { durationMinutes: 10 }),
    act("long", { durationMinutes: 45 }),
  ];
  const max = (value: number): TimeFilter => ({ mode: "max", value, includeNoDuration: false });

  it("offers the next preset that fits", () => {
    expect(suggestLoosening(acts, [], max(5), cats)).toMatchObject({
      kind: "time",
      label: "15 min",
      count: 1,
    });
  });

  it("falls back to any length for advanced filters", () => {
    const min: TimeFilter = { mode: "min", value: 100, includeNoDuration: false };
    expect(suggestLoosening(acts, [], min, cats)).toMatchObject({
      kind: "time",
      label: "any length",
      count: 2,
    });
  });

  it("says so when the picked categories are empty", () => {
    expect(suggestLoosening([], [], any, cats)).toEqual({ kind: "none-in-categories" });
  });
});
