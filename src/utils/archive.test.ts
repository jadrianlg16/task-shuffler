import { describe, expect, it } from "vitest";
import type { Activity } from "@/types";
import { groupArchive } from "./archive";

const now = new Date(2026, 8, 22, 15, 0); // local time, Tue 22 Sep 2026 15:00
const at = (daysBack: number, hour = 10) =>
  new Date(2026, 8, 22 - daysBack, hour, 0).toISOString();
const done = (id: string, completedAt: string | null): Activity => ({
  id,
  name: id,
  durationMinutes: null,
  categoryId: "school",
  status: "archived",
  createdAt: at(30),
  completedAt,
});

describe("groupArchive", () => {
  it("sorts newest first and buckets by calendar day", () => {
    const groups = groupArchive(
      [
        done("lastMonth", at(20)),
        done("thisMorning", at(0, 8)),
        done("yesterday", at(1)),
        done("justNow", at(0, 14)),
        done("sixDaysAgo", at(6)),
        done("sevenDaysAgo", at(7)),
      ],
      now
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", ["justNow", "thisMorning"]],
      ["This week", ["yesterday", "sixDaysAgo"]],
      ["Earlier", ["sevenDaysAgo", "lastMonth"]],
    ]);
  });

  it("ignores active tasks, drops empty buckets, and files undated ones under Earlier", () => {
    const active = { ...done("a", null), status: "active" as const };
    expect(groupArchive([active, done("undated", null)], now)).toEqual([
      { label: "Earlier", items: [done("undated", null)] },
    ]);
  });
});
