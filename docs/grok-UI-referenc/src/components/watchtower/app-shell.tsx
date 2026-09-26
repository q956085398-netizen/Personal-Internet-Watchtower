import { formatDistanceToNowStrict } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Menu, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefing } from "@/components/watchtower/briefing";
import { Sidebar } from "@/components/watchtower/sidebar";
import { TowerMark } from "@/components/watchtower/mark";
import { Button } from "@/components/ui/button";
import { selectView, useWatchtower } from "@/lib/watchtower-store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const store = useWatchtower();
  const { watchpoints, events } = useMemo(() => selectView(store), [store]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!useWatchtower.persist.hasHydrated()) {
      const unsub = useWatchtower.persist.onFinishHydration(() => {
        useWatchtower.getState().setHydrated();
      });
      return unsub;
    }
    useWatchtower.getState().setHydrated();
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (!useWatchtower.getState().lastPatrolAt) {
      useWatchtower.setState({ lastPatrolAt: Date.now() });
    }
  }, []);

  const lastPatrolLabel = useMemo(() => {
    if (!now || !store.lastPatrolAt) return "刚刚";
    if (store.patrolling) return "正在巡逻";
    return formatDistanceToNowStrict(store.lastPatrolAt, {
      locale: zhCN,
      addSuffix: true,
    });
  }, [now, store.lastPatrolAt, store.patrolling]);

  async function onPatrol() {
    await store.patrol();
    toast("巡逻完成");
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh max-w-[1120px]">
        <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 border-r border-line bg-paper-sunken/60 px-5 py-8 lg:block">
          <Sidebar
            watchpoints={watchpoints}
            lastPatrolLabel={lastPatrolLabel}
            patrolling={store.patrolling}
            onPatrol={onPatrol}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2.5">
              <TowerMark className="size-8" />
              <div>
                <p className="font-display text-lg leading-none text-ink">瞭望塔</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{lastPatrolLabel}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="立刻巡逻"
                onClick={onPatrol}
                disabled={store.patrolling}
              >
                <RefreshCw className={cn("size-4", store.patrolling && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="瞭望点"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
            <Briefing
              events={events}
              onDismiss={store.dismiss}
              onDismissSection={store.dismissSection}
            />
          </main>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="关闭瞭望点"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex h-full w-80 max-w-[calc(100%-2.5rem)] flex-col overflow-hidden bg-paper-sunken px-5 py-6 shadow-card-hover">
            <div className="mb-2 flex shrink-0 justify-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭"
                onClick={() => setMenuOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar
                watchpoints={watchpoints}
                lastPatrolLabel={lastPatrolLabel}
                patrolling={store.patrolling}
                onPatrol={onPatrol}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
