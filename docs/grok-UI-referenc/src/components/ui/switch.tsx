import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors",
        "data-[state=checked]:border-horizon data-[state=checked]:bg-horizon data-[state=unchecked]:bg-paper-sunken",
        "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-paper-raised shadow-card transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:bg-ink-muted"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
