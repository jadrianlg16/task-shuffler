import { describe, expect, it } from "vitest";
import { isExampleTask, makeExampleTasks } from "./exampleTasks";
import { parseImportData, exportData } from "@/utils/exportImport";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

describe("example tasks", () => {
  const now = Date.parse("2026-09-23T12:00:00Z");
  const tasks = makeExampleTasks(now);

  it("are all recognisable as examples, and real ids are not", () => {
    expect(tasks.every(isExampleTask)).toBe(true);
    expect(isExampleTask({ id: "3f0c9a1e-real-uuid" })).toBe(false);
  });

  it("have unique ids, valid categories, and pass backup validation", () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(tasks.every((t) => ids.has(t.categoryId))).toBe(true);
    expect(() => parseImportData(exportData(tasks, DEFAULT_CATEGORIES))).not.toThrow();
  });

  it("are dated in the past, newest first", () => {
    const times = tasks.map((t) => Date.parse(t.createdAt));
    expect(times.every((t) => t < now)).toBe(true);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
