import { describe, expect, it } from "vitest";
import { exportData, parseImportData } from "./exportImport";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import type { Activity } from "@/types";

const task = (o: Partial<Activity> = {}): Activity => ({
  id: "t1",
  name: "Read",
  durationMinutes: 30,
  categoryId: "school",
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  completedAt: null,
  ...o,
});

describe("parseImportData", () => {
  it("round-trips an export", () => {
    const json = exportData([task()], DEFAULT_CATEGORIES);
    expect(parseImportData(json)).toEqual({
      activities: [task()],
      categories: DEFAULT_CATEGORIES,
    });
  });

  it("rejects non-JSON and non-backups with a readable message", () => {
    expect(() => parseImportData("not json")).toThrow(/valid JSON/);
    expect(() => parseImportData('{"tasks": []}')).toThrow(/backup/);
  });

  it("rejects malformed tasks instead of importing half a file", () => {
    const json = exportData([task(), task({ id: "t2", status: "done" as never })], DEFAULT_CATEGORIES);
    expect(() => parseImportData(json)).toThrow(/Task #2/);
  });

  it("rejects duplicate ids and a missing Unassigned category", () => {
    expect(() => parseImportData(exportData([task(), task()], DEFAULT_CATEGORIES))).toThrow(/duplicate/);
    const noUnassigned = DEFAULT_CATEGORIES.filter((c) => c.id !== "unassigned");
    expect(() => parseImportData(exportData([], noUnassigned))).toThrow(/Unassigned/);
  });

  it("moves tasks with an unknown category to Unassigned", () => {
    const out = parseImportData(exportData([task({ categoryId: "gone" })], DEFAULT_CATEGORIES));
    expect(out.activities[0].categoryId).toBe("unassigned");
  });

  it("accepts old backups without startedAt", () => {
    const old = JSON.parse(exportData([task()], DEFAULT_CATEGORIES));
    delete old.activities[0].startedAt;
    expect(parseImportData(JSON.stringify(old)).activities).toHaveLength(1);
  });
});
