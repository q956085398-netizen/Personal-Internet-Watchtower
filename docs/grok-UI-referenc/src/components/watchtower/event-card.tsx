import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceMark } from "@/components/watchtower/mark";
import { TimeAgo } from "@/components/watchtower/time-ago";
import { CONNECTORS, type EventItem } from "@/lib/watchtower-data";
import { cn } from "@/lib/utils";

export function EventCard({
  event,
  index,
  onDismiss,
}: {
  event: EventItem;
  index: number;
  onDismiss: () => void;
}) {
  const mark = CONNECTORS[event.connector].mark;

  return (
    <article
      className="briefing-card group relative rounded-xl bg-paper-raised p-4 shadow-card transition-[box-shadow,transform] duration-150 ease-out hover:shadow-card-hover"
      style={{ ["--i" as string]: index }}
    >
      <a
        href={event.url}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 rounded-xl"
        aria-label={`在原站打开：${event.title}`}
      />
      <div className="flex items-start gap-3">
        <SourceMark label={mark} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-xs text-ink-muted">
            <p className="truncate">{event.sourceLabel}</p>
            <span className="shrink-0">
              <TimeAgo minutesAgo={event.minutesAgo} />
            </span>
          </div>
          <h3 className="mt-1.5 font-medium leading-snug text-ink">{event.title}</h3>
          {event.summary ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{event.summary}</p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-ink">{event.reason}</p>
          {event.metrics && event.metrics.length > 0 ? (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              {event.metrics.map((m) => (
                <div key={m.label} className="flex gap-1.5">
                  <dt>{m.label}</dt>
                  <dd className="tabular-nums text-ink">{m.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {event.children && event.children.length > 0 ? (
            <ul className="relative z-10 mt-3 divide-y divide-line border-t border-line">
              {event.children.map((child) => (
                <li key={child.url}>
                  <a
                    href={child.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-horizon"
                  >
                    <span className="min-w-0 truncate">{child.title}</span>
                    {child.meta ? (
                      <span className="shrink-0 tabular-nums text-xs text-ink-muted">
                        {child.meta}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                event.live ? "text-live" : "text-ink-faint",
              )}
            >
              {event.live ? (
                <>
                  <span className="live-dot size-1.5 rounded-full bg-live" />
                  直播中
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  打开原站
                  <ArrowUpRight className="size-3.5" />
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="silent"
              size="sm"
              className="min-h-11 px-3"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss();
              }}
            >
              <Check className="size-3.5" />
              知道了
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
