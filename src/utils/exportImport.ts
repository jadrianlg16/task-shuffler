import type { Activity, Category } from "@/types";

export function exportData(
  activities: Activity[],
  categories: Category[]
): string {
  return JSON.stringify({ activities, categories }, null, 2);
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNullableStr = (v: unknown) => v === null || v === undefined || typeof v === "string";

function checkActivity(a: unknown, i: number): Activity {
  const x = a as Record<string, unknown>;
  const ok =
    x &&
    isStr(x.id) &&
    typeof x.name === "string" &&
    (x.durationMinutes === null ||
      (typeof x.durationMinutes === "number" && x.durationMinutes > 0)) &&
    isStr(x.categoryId) &&
    (x.status === "active" || x.status === "archived") &&
    isStr(x.createdAt) &&
    isNullableStr(x.completedAt) &&
    isNullableStr(x.startedAt);
  if (!ok) throw new Error(`Task #${i + 1} is missing fields or has the wrong types.`);
  return x as unknown as Activity;
}

function checkCategory(c: unknown, i: number): Category {
  const x = c as Record<string, unknown>;
  const ok =
    x &&
    isStr(x.id) &&
    isStr(x.name) &&
    typeof x.color === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(x.color) &&
    typeof x.sortOrder === "number";
  if (!ok) throw new Error(`Category #${i + 1} is missing fields or has the wrong types.`);
  // Older backups may lack the optional flags; default them.
  return {
    ...(x as unknown as Category),
    icon: typeof x.icon === "string" ? x.icon : "",
    isDefault: x.isDefault === true,
    isHidden: x.isHidden === true,
  };
}

/**
 * Parse and validate a backup file. Throws with a readable message instead of
 * letting a half-valid file replace real data.
 */
export function parseImportData(json: string): {
  activities: Activity[];
  categories: Category[];
} {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const d = data as Record<string, unknown>;
  if (!d || typeof d !== "object" || !Array.isArray(d.activities) || !Array.isArray(d.categories)) {
    throw new Error("That doesn't look like a done. backup (no tasks/categories lists).");
  }
  const categories = d.categories.map(checkCategory);
  if (categories.length === 0) throw new Error("The backup has no categories.");
  const activities = d.activities.map(checkActivity);

  const catIds = new Set(categories.map((c) => c.id));
  if (!catIds.has("unassigned")) {
    throw new Error("The backup is missing the Unassigned category.");
  }
  const dupes = (ids: string[]) => ids.length !== new Set(ids).size;
  if (dupes(activities.map((a) => a.id)) || dupes(categories.map((c) => c.id))) {
    throw new Error("The backup contains duplicate ids.");
  }
  // Tasks pointing at a category that isn't in the file fall back to Unassigned.
  return {
    categories,
    activities: activities.map((a) =>
      catIds.has(a.categoryId) ? a : { ...a, categoryId: "unassigned" }
    ),
  };
}

export function downloadJson(data: string, filename: string): void {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
