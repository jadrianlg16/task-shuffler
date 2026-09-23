export type Activity = {
  id: string;
  name: string;
  durationMinutes: number | null;
  categoryId: string;
  status: "active" | "archived";
  createdAt: string;
  completedAt: string | null;
  /** Set while this is the task you're doing now ("Start"). Older data lacks it. */
  startedAt?: string | null;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isHidden: boolean;
  sortOrder: number;
};

export type TimeFilterMode = "any" | "max" | "min" | "range" | "exact";

export type TimeFilter = {
  mode: TimeFilterMode;
  value?: number;
  min?: number;
  max?: number;
  includeNoDuration: boolean;
};

