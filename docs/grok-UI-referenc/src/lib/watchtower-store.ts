import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ADDABLE_TEMPLATES,
  mergeEvents,
  mergeWatchpoints,
  type EventItem,
  type SectionId,
  type Watchpoint,
} from "@/lib/watchtower-data";

type State = {
  pausedIds: string[];
  resumedIds: string[];
  removedIds: string[];
  extraWatchpoints: Watchpoint[];
  extraEvents: EventItem[];
  dismissedIds: string[];
  lastPatrolAt: number | null;
  patrolling: boolean;
  hydrated: boolean;
  pause: (id: string) => void;
  resume: (id: string) => void;
  remove: (id: string) => void;
  dismiss: (id: string) => void;
  dismissSection: (eventIds: string[]) => void;
  addTemplate: (watchpointId: string) => boolean;
  patrol: () => Promise<void>;
  reset: () => void;
  setHydrated: () => void;
};

const empty = {
  pausedIds: [] as string[],
  resumedIds: [] as string[],
  removedIds: [] as string[],
  extraWatchpoints: [] as Watchpoint[],
  extraEvents: [] as EventItem[],
  dismissedIds: [] as string[],
  lastPatrolAt: null as number | null,
  patrolling: false,
};

export const useWatchtower = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      pause: (id) =>
        set((s) => ({
          pausedIds: s.pausedIds.includes(id) ? s.pausedIds : [...s.pausedIds, id],
          resumedIds: s.resumedIds.filter((x) => x !== id),
        })),
      resume: (id) =>
        set((s) => ({
          resumedIds: s.resumedIds.includes(id) ? s.resumedIds : [...s.resumedIds, id],
          pausedIds: s.pausedIds.filter((x) => x !== id),
        })),
      remove: (id) =>
        set((s) => ({
          removedIds: s.removedIds.includes(id) ? s.removedIds : [...s.removedIds, id],
          extraWatchpoints: s.extraWatchpoints.filter((w) => w.id !== id),
          extraEvents: s.extraEvents.filter((e) => e.watchpointId !== id),
        })),
      dismiss: (id) =>
        set((s) => ({
          dismissedIds: s.dismissedIds.includes(id)
            ? s.dismissedIds
            : [...s.dismissedIds, id],
        })),
      dismissSection: (eventIds) =>
        set((s) => ({
          dismissedIds: [...new Set([...s.dismissedIds, ...eventIds])],
        })),
      addTemplate: (watchpointId) => {
        const template = ADDABLE_TEMPLATES.find((t) => t.watchpoint.id === watchpointId);
        if (!template) return false;
        const s = get();
        const points = mergeWatchpoints(
          s.pausedIds,
          s.resumedIds,
          s.removedIds,
          s.extraWatchpoints,
        );
        if (points.some((w) => w.id === watchpointId)) return false;
        set({
          extraWatchpoints: [...s.extraWatchpoints, template.watchpoint],
          extraEvents: [...s.extraEvents, ...template.events],
          removedIds: s.removedIds.filter((id) => id !== watchpointId),
        });
        return true;
      },
      patrol: async () => {
        if (get().patrolling) return;
        set({ patrolling: true });
        await new Promise((r) => setTimeout(r, 900));
        set({ patrolling: false, lastPatrolAt: Date.now() });
      },
      reset: () => set({ ...empty, hydrated: true, lastPatrolAt: Date.now() }),
    }),
    {
      name: "watchtower-preview-v1",
      partialize: (s) => ({
        pausedIds: s.pausedIds,
        resumedIds: s.resumedIds,
        removedIds: s.removedIds,
        extraWatchpoints: s.extraWatchpoints,
        extraEvents: s.extraEvents,
        dismissedIds: s.dismissedIds,
      }),
      onRehydrateStorage: () => () => {
        useWatchtower.getState().setHydrated();
      },
    },
  ),
);

export function selectView(s: State) {
  const watchpoints = mergeWatchpoints(
    s.pausedIds,
    s.resumedIds,
    s.removedIds,
    s.extraWatchpoints,
  );
  const allEvents = mergeEvents(s.extraEvents, s.removedIds);
  const dismissed = new Set(s.dismissedIds);
  const byId = new Map(watchpoints.map((w) => [w.id, w]));
  const events = allEvents.filter((e) => {
    if (dismissed.has(e.id)) return false;
    const wp = byId.get(e.watchpointId);
    if (!wp || wp.paused) return false;
    return true;
  });
  return { watchpoints, events };
}

export function eventsInSection(events: EventItem[], section: SectionId, cap: number) {
  return events
    .filter((e) => e.section === section)
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, cap);
}
