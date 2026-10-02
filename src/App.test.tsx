// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { backend, task } from "@/test/fakeApi";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";

vi.mock("@/api/db", async () => (await import("@/test/fakeApi")).fakeApi);

const TASKS = [
  task({ id: "a", name: "Write report", durationMinutes: 30 }),
  task({ id: "b", name: "Call the bank", durationMinutes: 15, categoryId: "personal" }),
  task({ id: "c", name: "Read a chapter", durationMinutes: null, categoryId: "hobby" }),
];

beforeAll(async () => {
  // jsdom has no matchMedia. Report "reduce" for the motion query, so the
  // shuffle goes straight to its result instead of spinning the reel.
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  window.scrollTo = () => {};
  // The dialogs are lazy-loaded. Import them once here, under a generous
  // timeout, so a cold first import can't eat into a test's own 5 s budget.
  await Promise.all([
    import("@/components/shuffle/ShuffleOverlay"),
    import("@/components/shuffle/PickedTaskDialog"),
  ]);
}, 60_000);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
  backend.reset({ activities: TASKS, categories: DEFAULT_CATEGORIES });
  useActivityStore.setState({ activities: [], isLoaded: false, loadError: null });
  useCategoryStore.setState({ categories: DEFAULT_CATEGORIES, isLoaded: false, loadError: null });
});

afterEach(cleanup);

/** The picked task's name, from the dialog title ("Your next task: …"). */
async function pickedName(): Promise<string> {
  // The dialog code is lazy-loaded, so the first one can take a moment.
  const dialog = await screen.findByRole("dialog", { name: /^Your next task: / }, { timeout: 5000 });
  const title = within(dialog)
    .getAllByRole("heading")
    .map((h) => h.textContent ?? "")
    .find((text) => text.startsWith("Your next task: "));
  return title?.replace("Your next task: ", "") ?? "";
}

describe("shuffle flow", () => {
  it("picks a task, skips one with Not feeling it, and starts the next", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Shuffle 3 tasks" }));

    const first = await pickedName();
    expect(TASKS.map((t) => t.name)).toContain(first);

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Not feeling it" }));
    await waitFor(async () => expect(await pickedName()).not.toBe(first));
    const second = await pickedName();
    expect(screen.getByText("1 skipped until you close this")).toBeTruthy();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Pinned in the Now card, and the start was saved to the backend.
    const now = screen.getByRole("region", { name: "Now" });
    expect(within(now).getByRole("heading", { name: second })).toBeTruthy();
    await waitFor(() =>
      expect(backend.activities.filter((t) => t.startedAt).map((t) => t.name)).toEqual([second])
    );
  });
});

describe("startup with the API down", () => {
  it("shows an error with a retry instead of an empty list, and recovers", async () => {
    backend.fail("fetchActivities");
    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load your tasks");
    expect(alert.textContent).toContain("fetchActivities failed: 500");
    expect(screen.queryByText("No tasks yet")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Shuffle/ })).toBeNull();

    backend.recover();
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Shuffle 3 tasks" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
