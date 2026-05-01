import { writable } from 'svelte/store';

const DEFAULT_HINTS = { level1: 10, level2: 5, level3: 3 };

function createHintCounts() {
  const { subscribe, set, update } = writable({ ...DEFAULT_HINTS });

  return {
    subscribe,

    useLevel1() {
      update(s => ({ ...s, level1: Math.max(0, s.level1 - 1) }));
    },

    useLevel2() {
      update(s => ({ ...s, level2: Math.max(0, s.level2 - 1) }));
    },

    useLevel3() {
      update(s => ({ ...s, level3: Math.max(0, s.level3 - 1) }));
    },

    reset() {
      set({ ...DEFAULT_HINTS });
    }
  };
}

export const hintCounts = createHintCounts();
