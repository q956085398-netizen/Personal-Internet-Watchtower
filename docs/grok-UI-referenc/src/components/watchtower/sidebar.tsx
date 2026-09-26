import { CircleAlert, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddWatchpoint } from "@/components/watchtower/add-watchpoint";
import { TowerMark } from "@/components/watchtower/mark";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CONNECTORS, type ConnectorId, type Watchpoint } from "@/lib/watchtower-data";
import { useWatchtower } from "@/lib/watchtower-store";
import { cn } from "@/lib/utils";

const CONNECTOR_ORDER: ConnectorId[] = [
  "nga",
  "bilibili",
  "lkong",
  "tieba",
  "youtube",
  "rss",
];

export function Sidebar({
  watchpoints,
  lastPatrolLabel,
  patrolling,
  onPatrol,
}: {
  watchpoints: Watchpoint[];
  lastPatrolLabel: string;
  patrolling: boolean;
  onPatrol: () => void;
}) {
  const pause = useWatchtower((s) => s.pause);
  const resume = useWatchtower((s) => s.resume);
  const remove = useWatchtower((s) => s.remove);
  const reset = useWatchtower((s) => s.reset);

  const grouped = CONNECTOR_ORDER.map((id) => ({
    id,
    items: watchpoints.filter((w) => w.connector === id),
  })).filter((g) => g.items.length > 0);

  const watching = watchpoints.filter((w) => !w.paused).length;
  const pausedCount = watchpoints.filter((w) => w.paused).length;
  const errors = watchpoints.filter((w) => w.status === "error");

  return (
    <div className="flex h-full flex-col">
      <header className="px-1">
        <div className="flex items-center gap-3">
          <TowerMark className="size-9" />
          <div>
            <p className="font-display text-2xl leading-none tracking-tight text-ink">
              瞭望塔
            </p>
            <p className="mt-1 text-[11px] tracking-[0.18em] text-ink-faint uppercase">
              Watchtower
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 rounded-xl bg-paper-raised p-4 shadow-card">
        <p className="text-xs tracking-wide text-ink-faint">上次巡逻</p>
        <p className="mt-1 font-medium text-ink">{lastPatrolLabel}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {watching} 处正在看
          {pausedCount ? ` · ${pausedCount} 处暂停` : ""}
        </p>
        {errors.length > 0 ? (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-caution">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            {errors.length} 处检查失败，其余不受影响
          </p>
        ) : (
          <p className="mt-2 text-sm text-clear">状态正常</p>
        )}
        <Button
          className="mt-4 w-full"
          onClick={onPatrol}
          disabled={patrolling}
        >
          {patrolling ? "正在巡逻…" : "立刻巡逻"}
        </Button>
      </div>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs tracking-wide text-ink-faint">瞭望点</h2>
          <span className="text-xs text-ink-faint">{watchpoints.length}</span>
        </div>
        <div className="flex flex-col gap-5">
          {grouped.map((group) => {
            const meta = CONNECTORS[group.id];
            const groupError = group.items.some((w) => w.status === "error");
            return (
              <section key={group.id}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{meta.short}</p>
                  {groupError ? (
                    <span className="text-[11px] text-caution">检查失败</span>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-1">
                  {group.items.map((w) => (
                    <WatchRow
                      key={w.id}
                      watchpoint={w}
                      onToggle={(on) => {
                        if (on) {
                          resume(w.id);
                          toast("已恢复检查", { description: w.name });
                        } else {
                          pause(w.id);
                          toast("已暂停", { description: `${w.name} 仍保留，只是先不看` });
                        }
                      }}
                      onRemove={() => {
                        remove(w.id);
                        toast("已移出瞭望塔", { description: w.name });
                      }}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="mt-4">
          <AddWatchpoint watchpoints={watchpoints} />
        </div>
      </div>

   </div>
  );
}

function WatchRow({
  watchpoint,
  onToggle,
  onRemove,
}: {
  watchpoint: Watchpoint;
  onToggle: (on: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-lg px-2 py-1.5 transition-colors",
        watchpoint.paused && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{watchpoint.name}</p>
          <p className="truncate text-[11px] text-ink-faint">{watchpoint.detail}</p>
        </div>
        <Switch
          checked={!watchpoint.paused}
          onCheckedChange={onToggle}
          aria-label={watchpoint.paused ? `恢复 ${watchpoint.name}` : `暂停 ${watchpoint.name}`}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-9 text-ink-faint hover:text-live"
          aria-label={`移除 ${watchpoint.name}`}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {watchpoint.status === "error" && watchpoint.error ? (
        <p className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-caution">
          <CircleAlert className="mt-0.5 size-3 shrink-0" />
          {watchpoint.error}
        </p>
      ) : null}
      {watchpoint.paused ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
          <Pause className="size-3" />
          已暂停
        </p>
      ) : null}
    </li>
  );
}
