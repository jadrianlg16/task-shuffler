import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import type { Category } from "@/types";
import { matchCategory, parseQuickAdd } from "./quickAdd";

const cats: Category[] = [
  ...DEFAULT_CATEGORIES,
  { id: "x1", name: "Side Hustle", color: "#000000", icon: "", isDefault: false, isHidden: false, sortOrder: 6 },
];
const p = (s: string) => parseQuickAdd(s, cats);

describe("parseQuickAdd", () => {
  it("leaves plain names alone", () => {
    expect(p("Water the plants")).toEqual({ name: "Water the plants", durationMinutes: null, categoryId: null });
  });

  it("reads minutes and hours in common forms", () => {
    expect(p("Read 30m").durationMinutes).toBe(30);
    expect(p("Read 45 min").durationMinutes).toBe(45);
    expect(p("Read 1h").durationMinutes).toBe(60);
    expect(p("Read 1.5h").durationMinutes).toBe(90);
    expect(p("Read 1h30").durationMinutes).toBe(90);
    expect(p("Read 2 hrs").durationMinutes).toBe(120);
  });

  it("reads a #category by name, case- and punctuation-insensitive", () => {
    expect(p("Call mom #personal")).toMatchObject({ name: "Call mom", categoryId: "personal" });
    expect(p("Invoice #SideHustle")).toMatchObject({ categoryId: "x1" });
    expect(p("Invoice #side-hustle")).toMatchObject({ categoryId: "x1" });
  });

  it("combines both anywhere in the line", () => {
    expect(p("15m Call mom #personal")).toEqual({ name: "Call mom", durationMinutes: 15, categoryId: "personal" });
  });

  it("keeps numbers that aren't durations", () => {
    expect(p("Read chapter 5")).toMatchObject({ name: "Read chapter 5", durationMinutes: null });
    expect(p("Buy 2m cable")).toMatchObject({ durationMinutes: 2 }); // documented trade-off
    expect(p("Email team2m")).toMatchObject({ name: "Email team2m", durationMinutes: null });
  });

  it("leaves unknown or ambiguous tags in the name", () => {
    expect(p("Fix bug #urgent")).toMatchObject({ name: "Fix bug #urgent", categoryId: null });
  });

  it("treats a line that is only shorthand as the name", () => {
    expect(p("30m")).toEqual({ name: "30m", durationMinutes: null, categoryId: null });
  });
});

describe("matchCategory", () => {
  it("matches a unique prefix but not an ambiguous one", () => {
    expect(matchCategory("sch", cats)?.id).toBe("school");
    expect(matchCategory("s", cats)).toBeNull(); // School and Side Hustle
  });
});
