type Write = { token: number; value: unknown };
type FieldState = { confirmed: unknown; pending: Write[] };

/**
 * Bookkeeping for optimistic field updates, so the screen ends up showing what
 * the server holds even when several saves to the same field overlap (start
 * then drop, rename twice, complete then Undo).
 *
 * For each item and field it keeps the value the server is known to hold and
 * the writes still in flight, oldest first. The screen shows the newest write
 * still in flight, or the confirmed value once none are left. A save that
 * succeeds becomes the confirmed value (responses arrive in the order the
 * server applied them); one that fails just drops out.
 */
export class PendingWrites<T extends { id: string }> {
  private fields = new Map<string, Map<keyof T, FieldState>>();
  private changes = new Map<number, { id: string; keys: (keyof T)[] }>();
  private nextToken = 1;

  /** Record a change about to be shown for `item`; returns its token. */
  begin(item: T, updates: Partial<T>): number {
    const token = this.nextToken++;
    const keys = Object.keys(updates) as (keyof T)[];
    let byField = this.fields.get(item.id);
    if (!byField) this.fields.set(item.id, (byField = new Map<keyof T, FieldState>()));
    for (const key of keys) {
      let state = byField.get(key);
      // No write in flight for this field: what is on screen is what the server has.
      if (!state) byField.set(key, (state = { confirmed: item[key], pending: [] }));
      state.pending.push({ token, value: updates[key] });
    }
    this.changes.set(token, { id: item.id, keys });
    return token;
  }

  /**
   * The save for `token` finished. Returns the item id and the values its
   * fields should show now.
   */
  settle(token: number, saved: boolean): { id: string; show: Partial<T> } | null {
    const change = this.changes.get(token);
    if (!change) return null;
    this.changes.delete(token);
    const byField = this.fields.get(change.id);
    const show: Partial<T> = {};
    for (const key of change.keys) {
      const state = byField?.get(key);
      const index = state?.pending.findIndex((w) => w.token === token) ?? -1;
      if (!state || index === -1) continue;
      const [write] = state.pending.splice(index, 1);
      if (saved) state.confirmed = write.value;
      const newest = state.pending[state.pending.length - 1];
      show[key] = (newest ? newest.value : state.confirmed) as T[keyof T];
      if (!newest) byField!.delete(key);
    }
    if (byField?.size === 0) this.fields.delete(change.id);
    return { id: change.id, show };
  }
}

/** `item` with `show` applied, or `item` itself if nothing would change. */
export function withValues<T extends object>(item: T, show: Partial<T>): T {
  const changed = (Object.keys(show) as (keyof T)[]).some((k) => !Object.is(item[k], show[k]));
  return changed ? { ...item, ...show } : item;
}
