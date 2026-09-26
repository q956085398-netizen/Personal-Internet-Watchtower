import { EventCard } from "@/components/watchtower/event-card";
import { Button } from "@/components/ui/button";
import {
  SECTIONS,
  SECTION_ORDER,
  type EventItem,
  type SectionId,
} from "@/lib/watchtower-data";
import { eventsInSection } from "@/lib/watchtower-store";

export function Briefing({
  events,
  onDismiss,
  onDismissSection,
}: {
  events: EventItem[];
  onDismiss: (id: string) => void;
  onDismissSection: (ids: string[]) => void;
}) {
  const groups = SECTION_ORDER.map((id) => ({
    id,
    ...SECTIONS[id],
    items: eventsInSection(events, id, SECTIONS[id].cap),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <AllClear />;
  }

  let running = 0;

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        const start = running;
        running += group.items.length;
        return (
          <SectionBlock
            key={group.id}
            id={group.id}
            title={group.title}
            items={group.items}
            startIndex={start}
            onDismiss={onDismiss}
            onDismissAll={() => onDismissSection(group.items.map((e) => e.id))}
          />
        );
      })}
    </div>
  );
}

function SectionBlock({
  id,
  title,
  items,
  startIndex,
  onDismiss,
  onDismissAll,
}: {
  id: SectionId;
  title: string;
  items: EventItem[];
  startIndex: number;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}) {
  return (
    <section aria-labelledby={`sec-${id}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id={`sec-${id}`}
          className="font-display text-2xl tracking-tight text-ink"
        >
          {title}
          <span className="ml-2 font-sans text-sm font-medium tabular-nums text-ink-faint">
            {items.length}
          </span>
        </h2>
        <Button variant="silent" size="sm" onClick={onDismissAll}>
          这一栏知道了
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((event, i) => (
          <EventCard
            key={event.id}
            event={event}
            index={startIndex + i}
            onDismiss={() => onDismiss(event.id)}
          />
        ))}
      </div>
    </section>
  );
}

function AllClear() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-16 text-center">
      <p className="text-sm text-ink-muted">暂无新内容</p>
    </div>
  );
}
