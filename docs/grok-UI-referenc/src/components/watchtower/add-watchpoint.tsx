import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SourceMark } from "@/components/watchtower/mark";
import { ADDABLE_TEMPLATES, CONNECTORS, type Watchpoint } from "@/lib/watchtower-data";
import { useWatchtower } from "@/lib/watchtower-store";

export function AddWatchpoint({
  watchpoints,
  compact = false,
}: {
  watchpoints: Watchpoint[];
  compact?: boolean;
}) {
  const addTemplate = useWatchtower((s) => s.addTemplate);
  const [open, setOpen] = useState(false);
  const existing = useMemo(() => new Set(watchpoints.map((w) => w.id)), [watchpoints]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "default"} className="w-full">
          <Plus className="size-4" />
          {compact ? <span className="sr-only">添加瞭望点</span> : "添加瞭望点"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>最近也开始逛这个地方？</DialogTitle>
          <DialogDescription>选择一个要加入的瞭望点。</DialogDescription>
        </DialogHeader>
        <ul className="mt-5 flex flex-col gap-2">
          {ADDABLE_TEMPLATES.map((t) => {
            const added = existing.has(t.watchpoint.id);
            const c = CONNECTORS[t.watchpoint.connector];
            return (
              <li
                key={t.watchpoint.id}
                className="flex items-center gap-3 rounded-lg bg-paper p-3"
              >
                <SourceMark label={c.mark} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {c.short} · {t.watchpoint.name}
                  </p>
                  <p className="text-xs text-ink-muted">{t.watchpoint.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant={added ? "ghost" : "default"}
                  disabled={added}
                  onClick={() => {
                    const ok = addTemplate(t.watchpoint.id);
                    if (ok) {
                      toast("已加入瞭望塔", {
                        description: `开始检查 ${c.short} · ${t.watchpoint.name}`,
                      });
                      setOpen(false);
                    }
                  }}
                >
                  {added ? "已在看" : "添加"}
                </Button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
