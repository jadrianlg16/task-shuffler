import type { Category } from "@/types";

export type QuickAddParse = {
  name: string;
  durationMinutes: number | null;
  categoryId: string | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// 30m, 30 min, 45mins, 1h, 1.5h, 2 hrs, 1h30, 1h30m
const DURATION =
  /(?:^|\s)(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)(?:\s*(\d+)\s*(?:m|min|mins)?)?|(\d+)\s*(?:m|min|mins|minute|minutes))(?=\s|$)/gi;
const TAG = /(?:^|\s)#([^\s#]+)(?=\s|$)/g;

/** Match a #tag to a category by name, ignoring case and punctuation. */
export function matchCategory(tag: string, categories: Category[]): Category | null {
  const t = norm(tag);
  if (!t) return null;
  const exact = categories.find((c) => norm(c.name) === t || c.id === tag.toLowerCase());
  if (exact) return exact;
  const prefix = categories.filter((c) => norm(c.name).startsWith(t));
  return prefix.length === 1 ? prefix[0] : null; // ambiguous prefixes don't guess
}

/**
 * Pull "30m" / "1h30" and "#category" out of a quick-add line. The last
 * duration and the last recognised tag win; unknown tags stay in the name.
 */
export function parseQuickAdd(input: string, categories: Category[]): QuickAddParse {
  let name = input;
  let durationMinutes: number | null = null;
  let categoryId: string | null = null;

  name = name.replace(DURATION, (match, hours, extraMin, mins) => {
    const minutes = hours
      ? Math.round(parseFloat(hours) * 60) + (extraMin ? parseInt(extraMin, 10) : 0)
      : parseInt(mins, 10);
    if (!minutes) return match;
    durationMinutes = minutes;
    return " ";
  });

  name = name.replace(TAG, (match, tag) => {
    const cat = matchCategory(tag, categories);
    if (!cat) return match;
    categoryId = cat.id;
    return " ";
  });

  name = name.replace(/\s+/g, " ").trim();
  // A line that is only shorthand ("30m") is a name, not an empty task.
  if (!name) return { name: input.trim(), durationMinutes: null, categoryId: null };
  return { name, durationMinutes, categoryId };
}
