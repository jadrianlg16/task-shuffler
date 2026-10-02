import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { describeError, persist } from "./persist";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("persist", () => {
  it("leaves the change alone when the save succeeds", async () => {
    const rollback = vi.fn();
    persist(Promise.resolve("ok"), rollback);
    await settle();
    expect(rollback).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Vitest fails the run on any unhandled rejection, so this also shows that
  // persist() always handles the failed save.
  it("rolls back and shows the shared error toast when the save fails", async () => {
    const rollback = vi.fn();
    persist(Promise.reject(new Error("PATCH /activities/1 failed: 500")), rollback);
    expect(rollback).not.toHaveBeenCalled(); // only once the save has failed
    await settle();
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Couldn't save"), {
      id: "save-failed",
    });
  });
});

describe("describeError", () => {
  it("uses an Error's message and stringifies anything else", () => {
    expect(describeError(new Error("GET /activities failed: 502"))).toBe(
      "GET /activities failed: 502"
    );
    expect(describeError("offline")).toBe("offline");
  });
});
