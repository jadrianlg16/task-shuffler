import type * as Db from "@/api/db";
import type { Activity, Category } from "@/types";

/**
 * In-memory stand-in for src/api/db.ts. Tests swap it in with
 *   vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);
 * then seed `backend`, and make calls fail with `backend.fail(...)`, or
 * `hold()` them and finish each one in any order with `release(...)`.
 * Data is cloned at the boundary, as it would be over HTTP.
 */
type Method = keyof typeof Db;

type HeldCall = { method: Method; finish: (ok: boolean) => void };

export const backend = {
  activities: [] as Activity[],
  categories: [] as Category[],
  failing: new Set<Method>(),
  calls: [] as Method[],
  holding: false,
  held: [] as HeldCall[],

  reset(data: { activities?: Activity[]; categories?: Category[] } = {}) {
    this.activities = structuredClone(data.activities ?? []);
    this.categories = structuredClone(data.categories ?? []);
    this.failing.clear();
    this.calls = [];
    this.holding = false;
    this.held = [];
  },
  /** Calls to these methods made from now until `recover()` reject (like a 500). */
  fail(...methods: Method[]) {
    for (const m of methods) this.failing.add(m);
  },
  recover() {
    this.failing.clear();
  },
  /** From now on, calls wait (in `held`, in call order) until released. */
  hold() {
    this.holding = true;
  },
  /** Finish held call `index`: apply it to the data (ok) or reject it like a 500. */
  release(index: number, ok: boolean) {
    this.held[index].finish(ok);
  },
};

async function call<T>(method: Method, run: () => T): Promise<T> {
  backend.calls.push(method);
  if (backend.holding) {
    // The server applies the call when it is released, in release order.
    return new Promise<T>((resolve, reject) => {
      backend.held.push({
        method,
        finish: (ok) =>
          ok ? resolve(structuredClone(run())) : reject(new Error(`${method} failed: 500`)),
      });
    });
  }
  // Decided when the call is made, so a test can fail one call and not the next.
  const fails = backend.failing.has(method);
  await Promise.resolve(); // never settle synchronously, like a real request
  if (fails) throw new Error(`${method} failed: 500`);
  return structuredClone(run());
}

function patch<T extends { id: string }>(list: T[], id: string, updates: Partial<T>): T {
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) throw new Error(`${id} failed: 404`);
  list[index] = { ...list[index], ...updates };
  return list[index];
}

export const fakeApi: typeof Db = {
  fetchActivities: () => call("fetchActivities", () => backend.activities),
  saveActivity: (a) => call("saveActivity", () => (backend.activities.push(structuredClone(a)), a)),
  updateActivity: (id, updates) =>
    call("updateActivity", () => patch(backend.activities, id, updates)),
  deleteActivity: (id) =>
    call("deleteActivity", () => {
      backend.activities = backend.activities.filter((a) => a.id !== id);
    }),
  fetchCategories: () => call("fetchCategories", () => backend.categories),
  saveCategory: (c) => call("saveCategory", () => (backend.categories.push(structuredClone(c)), c)),
  updateCategory: (id, updates) =>
    call("updateCategory", () => patch(backend.categories, id, updates)),
  deleteCategory: (id) =>
    call("deleteCategory", () => {
      backend.categories = backend.categories.filter((c) => c.id !== id);
    }),
  replaceAll: (activities, categories) =>
    call("replaceAll", () => {
      backend.activities = structuredClone(activities);
      backend.categories = structuredClone(categories);
    }),
};

/** Let pending promise callbacks (saves, rollbacks) run. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export const task = (o: Partial<Activity> = {}): Activity => ({
  id: "t1",
  name: "Task",
  durationMinutes: 30,
  categoryId: "school",
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  completedAt: null,
  ...o,
});
