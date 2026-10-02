import { beforeEach, describe, expect, it, vi } from "vitest";
import { backend, task } from "@/test/fakeApi";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { useActivityStore } from "./activityStore";
import { useCategoryStore } from "./categoryStore";

vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

/**
 * Several saves to the same task or category in flight at once, finished in
 * every order with every mix of success and failure. Whatever happens, once
 * all of them have settled the screen must match what the server holds.
 */

const permutations = (n: number): number[][] =>
  n === 0
    ? [[]]
    : permutations(n - 1).flatMap((p) =>
        Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)])
      );
const outcomes = (n: number): boolean[][] =>
  Array.from({ length: 2 ** n }, (_, mask) =>
    Array.from({ length: n }, (_, i) => Boolean(mask & (1 << i)))
  );

/** Let promise callbacks run (microtasks only: hundreds of cases stay fast). */
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const byId = <T extends { id: string }>(list: T[]) =>
  Object.fromEntries(list.map((x) => [x.id, x]));

/** Run `scenario` against held saves, for every finish order and outcome. */
async function everyOrderAndOutcome(
  load: () => Promise<void>,
  scenario: () => void,
  screen: () => { id: string }[],
  server: () => { id: string }[]
) {
  let cases = 0;
  const failures: string[] = [];
  // Count the calls once (then finish them, as real requests always finish),
  // and replay the scenario for every combination.
  const calls = await (async () => {
    await load();
    backend.hold();
    scenario();
    const n = backend.held.length;
    for (let i = 0; i < n; i++) backend.release(i, false);
    await flush();
    return n;
  })();
  expect(calls).toBeGreaterThan(1);
  for (const order of permutations(calls)) {
    for (const ok of outcomes(calls)) {
      await load();
      backend.hold();
      scenario();
      for (const i of order) {
        backend.release(i, ok[i]);
        await flush();
      }
      cases++;
      const label = `order ${order.join(">")}, ok ${ok.map(Number).join("")}`;
      try {
        expect(byId(screen())).toEqual(byId(server()));
      } catch {
        failures.push(label);
      }
    }
  }
  expect(failures, `${failures.length}/${cases} cases left the screen out of step`).toEqual([]);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // expected save failures
});

describe("overlapping task saves", { timeout: 30_000 }, () => {
  const tasks = [task({ id: "a", name: "A" }), task({ id: "b", name: "B" })];
  const load = async () => {
    backend.reset({ activities: tasks });
    useActivityStore.setState({ activities: [], isLoaded: false, loadError: null });
    await useActivityStore.getState().loadActivities();
  };
  const store = () => useActivityStore.getState();
  const run = (scenario: () => void) =>
    everyOrderAndOutcome(
      load,
      scenario,
      () => store().activities,
      () => backend.activities
    );

  it("start, then drop", () =>
    run(() => {
      store().startActivity("a");
      store().dropActivity("a");
    }));

  it("start task A, then start task B (which stops A)", () =>
    run(() => {
      store().startActivity("a");
      store().startActivity("b");
    }));

  it("rename to X, then to Y", () =>
    run(() => {
      store().updateActivity("a", { name: "X" });
      store().updateActivity("a", { name: "Y" });
    }));

  it("complete, then Undo from the list (restore)", () =>
    run(() => {
      store().completeActivity("a");
      store().restoreActivity("a");
    }));

  it("start, complete, then Undo from the Now card", () =>
    run(() => {
      store().startActivity("a");
      const startedAt = store().activities.find((x) => x.id === "a")?.startedAt;
      store().completeActivity("a");
      store().updateActivity("a", { status: "active", completedAt: null, startedAt });
    }));

  it("rename, then change the length", () =>
    run(() => {
      store().updateActivity("a", { name: "Renamed" });
      store().updateActivity("a", { durationMinutes: 99 });
    }));
});

describe("overlapping category saves", { timeout: 30_000 }, () => {
  const load = async () => {
    backend.reset({ categories: DEFAULT_CATEGORIES });
    useCategoryStore.setState({ categories: DEFAULT_CATEGORIES, isLoaded: false, loadError: null });
    await useCategoryStore.getState().loadCategories();
  };
  const store = () => useCategoryStore.getState();
  const run = (scenario: () => void) =>
    everyOrderAndOutcome(
      load,
      scenario,
      () => store().categories,
      () => backend.categories
    );

  it("rename to X, then to Y", () =>
    run(() => {
      store().updateCategory("hobby", { name: "X" });
      store().updateCategory("hobby", { name: "Y" });
    }));

  it("hide, then show", () =>
    run(() => {
      store().toggleHidden("hobby");
      store().toggleHidden("hobby");
    }));

  it("rename, then hide", () =>
    run(() => {
      store().updateCategory("hobby", { name: "Hobbies" });
      store().toggleHidden("hobby");
    }));

  it("move a category down, then back up", () =>
    run(() => {
      store().reorderCategories(["personal", "school"]);
      store().reorderCategories(["school", "personal"]);
    }));
});
