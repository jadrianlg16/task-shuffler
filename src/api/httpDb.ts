import type { Activity, Category } from "@/types";

// Same-origin path, proxied to json-server by Vite (see vite.config.ts), so the
// app works from any host that can reach the UI — not only the machine running it.
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

/** fetch() only rejects on network failure; treat any non-2xx as an error too. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const fetchActivities = () => request<Activity[]>("/activities");
export const saveActivity = (activity: Activity) =>
  request<Activity>("/activities", send("POST", activity));
export const updateActivity = (id: string, updates: Partial<Activity>) =>
  request<Activity>(`/activities/${id}`, send("PATCH", updates));
export const deleteActivity = async (id: string) => {
  await request<unknown>(`/activities/${id}`, { method: "DELETE" });
};

export const fetchCategories = () => request<Category[]>("/categories");
export const saveCategory = (category: Category) =>
  request<Category>("/categories", send("POST", category));
export const updateCategory = (id: string, updates: Partial<Category>) =>
  request<Category>(`/categories/${id}`, send("PATCH", updates));
export const deleteCategory = async (id: string) => {
  await request<unknown>(`/categories/${id}`, { method: "DELETE" });
};

/**
 * Replace everything with an imported backup. json-server has no transaction,
 * so every imported item is written first and leftovers are deleted last:
 * a failure part-way leaves extra old items behind, never missing ones.
 */
export async function replaceAll(activities: Activity[], categories: Category[]) {
  const [oldCategories, oldActivities] = await Promise.all([
    request<Category[]>("/categories"),
    request<Activity[]>("/activities"),
  ]);
  await upsert("categories", categories, oldCategories);
  await upsert("activities", activities, oldActivities);
  await removeMissing("activities", activities, oldActivities);
  await removeMissing("categories", categories, oldCategories);
}

async function upsert<T extends { id: string }>(name: string, items: T[], existing: T[]) {
  const existingIds = new Set(existing.map((e) => e.id));
  for (const item of items) {
    if (existingIds.has(item.id)) await request(`/${name}/${item.id}`, send("PUT", item));
    else await request(`/${name}`, send("POST", item));
  }
}

async function removeMissing<T extends { id: string }>(name: string, items: T[], existing: T[]) {
  const keep = new Set(items.map((i) => i.id));
  for (const old of existing) {
    if (!keep.has(old.id)) await request(`/${name}/${old.id}`, { method: "DELETE" });
  }
}
