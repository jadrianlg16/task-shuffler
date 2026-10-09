import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { backend, settle } from "@/test/fakeApi";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { useCategoryStore } from "./categoryStore";

vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const store = () => useCategoryStore.getState();
const ids = () => store().categories.map((c) => c.id);
const byId = (id: string) => store().categories.find((c) => c.id === id);

beforeEach(async () => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {}); // expected save failures
  backend.reset({ categories: DEFAULT_CATEGORIES });
  useCategoryStore.setState({ categories: DEFAULT_CATEGORIES, isLoaded: false, loadError: null });
  await store().loadCategories();
});

describe("loadCategories", () => {
  it("falls back to the defaults when the backend has none", async () => {
    backend.reset({ categories: [] });
    await store().loadCategories();
    expect(store().categories).toEqual(DEFAULT_CATEGORIES);
    expect(store().isLoaded).toBe(true);
  });

  it("records a failure instead of rejecting", async () => {
    useCategoryStore.setState({ isLoaded: false });
    backend.fail("fetchCategories");
    await expect(store().loadCategories()).resolves.toBeUndefined();
    expect(store().loadError).toBe("fetchCategories failed: 500");
    expect(store().isLoaded).toBe(false);
  });
});

describe("optimistic changes", () => {
  it("adds a category at the end, and removes it again if the save fails", async () => {
    backend.fail("saveCategory");
    store().addCategory("Health", "#10B981");
    expect(store().categories[DEFAULT_CATEGORIES.length]).toMatchObject({
      name: "Health",
      isDefault: false,
      sortOrder: DEFAULT_CATEGORIES.length,
    });
    await settle();
    expect(ids()).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(toast.error).toHaveBeenCalledWith(expect.any(String), { id: "save-failed" });
  });

  it("puts a deleted category back in place when the delete fails", async () => {
    const before = ids();
    backend.fail("deleteCategory");
    store().deleteCategory(before[2]);
    expect(ids()).not.toContain(before[2]);
    await settle();
    expect(ids()).toEqual(before);
  });

  it("toggles hidden and saves it", async () => {
    store().toggleHidden("hobby");
    await settle();
    expect(byId("hobby")?.isHidden).toBe(true);
    expect(backend.categories.find((c) => c.id === "hobby")?.isHidden).toBe(true);
  });

  it("reorders by rewriting sortOrder, and rolls the order back if saving fails", async () => {
    const reversed = [...ids()].reverse();
    store().reorderCategories(reversed);
    await settle();
    expect(reversed.map((id) => byId(id)?.sortOrder)).toEqual(reversed.map((_, i) => i));

    const before = store().categories.map((c) => c.sortOrder);
    backend.fail("updateCategory");
    store().reorderCategories(ids());
    await settle();
    expect(store().categories.map((c) => c.sortOrder)).toEqual(before);
    // One call per failed request, all with the same id, so sonner shows a single toast.
    const calls = vi.mocked(toast.error).mock.calls;
    expect(calls).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(calls.every(([, opts]) => opts?.id === "save-failed")).toBe(true);
  });
});

describe("overlapping changes to one category", () => {
  it("rolls two failed changes back field by field", async () => {
    backend.fail("updateCategory");
    store().updateCategory("hobby", { name: "Hobbies" });
    store().toggleHidden("hobby");
    await settle();
    expect(byId("hobby")).toMatchObject({ name: "Hobby", isHidden: false });
  });

  it("keeps a later saved change when an earlier one to another field fails", async () => {
    backend.fail("updateCategory");
    store().updateCategory("hobby", { name: "Hobbies" });
    backend.recover();
    store().toggleHidden("hobby");
    await settle();
    expect(byId("hobby")).toMatchObject({ name: "Hobby", isHidden: true });
    expect(backend.categories.find((c) => c.id === "hobby")?.isHidden).toBe(true);
  });
});
