import type { Activity, Category } from "@/types";

export function exportData(
  activities: Activity[],
  categories: Category[]
): string {
  return JSON.stringify({ activities, categories }, null, 2);
}

export function parseImportData(json: string): {
  activities: Activity[];
  categories: Category[];
} {
  const data = JSON.parse(json);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid import data");
  }
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  return { activities, categories };
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
