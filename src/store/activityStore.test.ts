import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { backend, settle, task } from "@/test/fakeApi";
import { useActivityStore } from "./activityStore";

vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const store = () => useActivityStore.getState();
const names = () => store().activities.map((a) => a.name);
const byId = (id: string) => store().activities.find((a) => a.id === id);

const a = task({ id: "a", name: "A" });
const b = task({ id: "b", name: "B", categoryId: "hobby" });
const c = task({ id: "c", name: "C" });

beforeEach(async () => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {}); // expected save failures
  backend.reset({ activities: [a, b, c] });
  useActivityStore.setState({ activities: [], isLoaded: false, loadError: null });
  await store().loadActivities();
});

describe("loadActivities", () => {
  it("loads what the backend holds", () => {
    expect(names()).toEqual(["A", "B", "C"]);
    expect(store().isLoaded).toBe(true);
    expect(store().loadError).toBeNull();
  });

  it("records a failure instead of rejecting, and clears it on the next success", async () => {
    useActivityStore.setState({ activities: [], isLoaded: false });
    backend.fail("fetchActivities");
    await expect(store().loadActivities()).resolves.toBeUndefined();
    expect(store().loadError).toBe("fetchActivities failed: 500");
    expect(store().isLoaded).toBe(false);

    backend.recover();
    await store().loadActivities();
    expect(store().loadError).toBeNull();
    expect(names()).toEqual(["A", "B", "C"]);
  });
});

describe("optimistic changes", () => {
  it("shows a new task at once and keeps it when the save succeeds", async () => {
    store().addActivity("New", 15, "school");
    expect(names()[0]).toBe("New"); // before the save settles
    await settle();
    expect(backend.activities.map((x) => x.name)).toContain("New");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("removes a new task again when the save fails, with one toast", async () => {
    backend.fail("saveActivity");
    store().addActivity("New", 15, "school");
    expect(names()).toContain("New");
    await settle();
    expect(names()).toEqual(["A", "B", "C"]);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.any(String), { id: "save-failed" });
  });

  it("rolls back only the update that failed, keeping later changes to other tasks", async () => {
    backend.fail("updateActivity");
    store().updateActivity("a", { name: "A edited" });
    // A local-only change made while the save is in flight must survive the rollback.
    useActivityStore.setState((s) => ({
      activities: s.activities.map((x) => (x.id === "b" ? { ...x, name: "B local" } : x)),
    }));
    await settle();
    expect(byId("a")?.name).toBe("A");
    expect(byId("b")?.name).toBe("B local");
  });

  it("puts a task back in its old place when a delete fails", async () => {
    backend.fail("deleteActivity");
    store().deleteActivity("b");
    expect(names()).toEqual(["A", "C"]);
    await settle();
    expect(names()).toEqual(["A", "B", "C"]);
    expect(backend.activities).toHaveLength(3);
  });

  it("completes a task by archiving it with a timestamp", async () => {
    store().completeActivity("a");
    await settle();
    expect(byId("a")?.status).toBe("archived");
    expect(byId("a")?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(backend.activities.find((x) => x.id === "a")?.status).toBe("archived");
  });
});

describe("overlapping changes to one task", () => {
  it("rolls two failed changes back to what the server holds", async () => {
    backend.fail("updateActivity");
    store().startActivity("a");
    store().completeActivity("a");
    await settle();
    expect(byId("a")).toMatchObject({ status: "active", completedAt: null });
    expect(byId("a")?.startedAt ?? null).toBeNull(); // not shown as "Now"
    expect(backend.activities.find((x) => x.id === "a")?.startedAt ?? null).toBeNull();
  });

  it("keeps a later saved value when an earlier change to the same field fails", async () => {
    backend.fail("updateActivity");
    store().updateActivity("a", { name: "First" });
    backend.recover();
    store().updateActivity("a", { name: "Second" });
    await settle();
    expect(byId("a")?.name).toBe("Second");
    expect(backend.activities.find((x) => x.id === "a")?.name).toBe("Second");
  });

  it("rolls back only the fields the failed change wrote", async () => {
    backend.fail("updateActivity");
    store().updateActivity("a", { name: "Renamed" });
    backend.recover();
    store().updateActivity("a", { durationMinutes: 99 });
    await settle();
    expect(byId("a")).toMatchObject({ name: "A", durationMinutes: 99 });
  });
});

describe("start and drop", () => {
  it("starting a task stops any other started task", async () => {
    store().startActivity("a");
    store().startActivity("b");
    await settle();
    expect(byId("a")?.startedAt).toBeNull();
    expect(byId("b")?.startedAt).toEqual(expect.any(String));
    expect(backend.activities.filter((x) => x.startedAt)).toHaveLength(1);
  });

  it("drop clears startedAt; a failed drop restores it", async () => {
    store().startActivity("a");
    await settle();
    const startedAt = byId("a")?.startedAt;
    backend.fail("updateActivity");
    store().dropActivity("a");
    expect(byId("a")?.startedAt).toBeNull();
    await settle();
    expect(byId("a")?.startedAt).toBe(startedAt);
  });
});

describe("bulk changes", () => {
  it("moves every task in a category to another one", async () => {
    store().bulkReassignCategory("school", "unassigned");
    await settle();
    expect(
      store()
        .activities.filter((x) => x.categoryId === "unassigned")
        .map((x) => x.id)
    ).toEqual(["a", "c"]);
    expect(byId("b")?.categoryId).toBe("hobby");
  });

  it("adds the examples once and clears only them", async () => {
    store().addExamples();
    store().addExamples(); // already there: no duplicates
    await settle();
    const examples = store().activities.filter((x) => x.id.startsWith("demo-"));
    expect(examples.length).toBeGreaterThan(0);
    expect(new Set(store().activities.map((x) => x.id)).size).toBe(store().activities.length);

    store().clearExamples();
    await settle();
    expect(names()).toEqual(["A", "B", "C"]);
    expect(backend.activities.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
