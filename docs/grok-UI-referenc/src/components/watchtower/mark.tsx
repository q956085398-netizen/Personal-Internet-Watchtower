import { cn } from "@/lib/utils";

export function TowerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-horizon", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        className="tower-beam"
        d="M16.5 9.2 L27 5.5 M16.5 9.2 L27 13"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.4"
      />
      <path d="M4 24 H28" stroke="currentColor" strokeWidth="1" />
      <path d="M16 11 V24" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M13.5 7.2 L16 5.4 L18.5 7.2 V11.2 H13.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HorizonRule({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={cn("text-horizon", className)}
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 18 H108" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M120 9 V18" stroke="currentColor" strokeWidth="1.4" />
      <path d="M114.5 6.2 L120 4.2 L125.5 6.2 V10.2 H114.5 Z" fill="currentColor" />
      <path d="M132 18 H240" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export function SourceMark({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-paper-sunken font-mono text-[10px] font-medium tracking-tight text-horizon",
        className,
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
