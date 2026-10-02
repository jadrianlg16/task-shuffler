import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { backend, task } from "@/test/fakeApi";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { useActivityStore } from "./activityStore";
import { useCategoryStore } from "./categoryStore";
import { loadAll } from "./loadAll";
import { replaceAllData } from "./replaceAllData";

vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const old = [task({ id: "old", name: "Old" })];
const imported = [task({ id: "new1", name: "New 1" }), task({ id: "new2", name: "New 2" })];
const importedCategories = DEFAULT_CATEGORIES.filter((c) => c.id !== "field");
const shown = () => useActivityStore.getState().activities.map((a) => a.id);

beforeEach(async () => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  backend.reset({ activities: old, categories: DEFAULT_CATEGORIES });
  useActivityStore.setState({ activities: [], isLoaded: false, loadError: null });
  useCategoryStore.setState({ categories: DEFAULT_CATEGORIES, isLoaded: false, loadError: null });
  await loadAll();
});

describe("replaceAllData", () => {
  it("saves first, then shows the imported data", async () => {
    await expect(replaceAllData(imported, importedCategories)).resolves.toBe(true);
    expect(backend.activities.map((a) => a.id)).toEqual(["new1", "new2"]);
    expect(shown()).toEqual(["new1", "new2"]);
    expect(useCategoryStore.getState().categories.map((c) => c.id)).not.toContain("field");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("on failure, shows what the backend actually holds, not the import", async () => {
    // json-server has no transactions: say one task made it before the failure.
    backend.activities.push(structuredClone(imported[0]));
    backend.fail("replaceAll");

    await expect(replaceAllData(imported, importedCategories)).resolves.toBe(false);
    expect(shown()).toEqual(["old", "new1"]);
    expect(useCategoryStore.getState().categories.map((c) => c.id)).toContain("field");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Import didn't finish"));
  });

  it("if the reload fails too, flags a load error rather than keeping stale lists", async () => {
    backend.fail("replaceAll", "fetchActivities");
    await expect(replaceAllData(imported, importedCategories)).resolves.toBe(false);
    expect(useActivityStore.getState().loadError).toBe("fetchActivities failed: 500");
  });
});
