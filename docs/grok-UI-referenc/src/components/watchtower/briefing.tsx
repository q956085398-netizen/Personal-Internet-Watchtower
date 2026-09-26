import { EventCard } from "@/components/watchtower/event-card";
import { HorizonRule } from "@/components/watchtower/mark";
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
      <header>
        <p className="text-xs tracking-[0.18em] text-ink-faint uppercase">本次快照</p>
        <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
          有限，有尽头。
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          只回答一件事：你平时会看的这几个地方，现在有没有值得点进去的东西。
        </p>
      </header>

      {groups.map((group) => {
        const start = running;
        running += group.items.length;
        return (
          <SectionBlock
            key={group.id}
            id={group.id}
            title={group.title}
            kicker={group.kicker}
            items={group.items}
            startIndex={start}
            onDismiss={onDismiss}
            onDismissAll={() => onDismissSection(group.items.map((e) => e.id))}
          />
        );
      })}

      <EndNote />
    </div>
  );
}

function SectionBlock({
  id,
  title,
  kicker,
  items,
  startIndex,
  onDismiss,
  onDismissAll,
}: {
  id: SectionId;
  title: string;
  kicker: string;
  items: EventItem[];
  startIndex: number;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}) {
  return (
    <section aria-labelledby={`sec-${id}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-faint">{kicker}</p>
          <h2
            id={`sec-${id}`}
            className="mt-1 font-display text-2xl tracking-tight text-ink"
          >
            {title}
            <span className="ml-2 font-sans text-sm font-medium tabular-nums text-ink-faint">
              {items.length}
            </span>
          </h2>
        </div>
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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <HorizonRule className="h-8 w-56" />
      <h1 className="mt-8 font-display text-4xl tracking-tight text-ink sm:text-5xl">
        海面平静
      </h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-muted">
        现在没有值得你知道的新事情。可以关掉这个页面，回去做你正在做的事。
      </p>
      <p className="mt-6 text-sm text-clear">这就是瞭望塔该有的结果。</p>
    </div>
  );
}

function EndNote() {
  return (
    <footer className="flex flex-col items-center pb-8 pt-4 text-center">
      <HorizonRule className="h-6 w-48" />
      <p className="mt-5 font-display text-lg tracking-tight text-ink">
        以上就是这次巡逻的全部。
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        没有下一页，没有推荐流。没有值得看的东西，本身就是答案。
      </p>
    </footer>
  );
}
