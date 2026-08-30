/**
 * A minimal observable store.
 *
 * Act I of Core Sample is a globe, a band chart, a dial and a dossier that all
 * read the same two values: the warming the reader has dialled in, and which
 * element they have selected. The original wrote that as each view calling every
 * other view's repaint function — which works, and means adding a fifth view
 * requires editing the other four.
 *
 * Here the views subscribe instead. Nothing calls anything; changing the state is
 * the whole interaction, and each view decides for itself what that means.
 */
export interface Store<T> {
  get(): Readonly<T>;
  set(patch: Partial<T>): void;
  subscribe(listener: (state: Readonly<T>) => void): () => void;
}

export const createStore = <T extends object>(initial: T): Store<T> => {
  let state: T = { ...initial };
  const listeners = new Set<(state: Readonly<T>) => void>();

  return {
    get: () => state,
    set(patch) {
      const next = { ...state, ...patch };
      // Reference equality per key: repainting a globe because a listener re-set
      // the same value would fight the drag handler for frames.
      const changed = (Object.keys(patch) as (keyof T)[]).some((k) => state[k] !== next[k]);
      if (!changed) return;
      state = next;
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
