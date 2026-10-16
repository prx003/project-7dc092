import { cn } from "@/lib/utils";

export function UserAvatar({
  src, name, size = 40, ring, className,
}: { src?: string | null; name?: string | null; size?: number; ring?: "unseen" | "seen" | null; className?: string }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  const inner = src ? (
    <img src={src} alt={name ?? ""} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center rounded-full bg-secondary font-display text-xs font-bold text-muted-foreground">
      {initials}
    </span>
  );
  if (!ring) return <span className={cn("block shrink-0 rounded-full", className)} style={{ width: size, height: size }}>{inner}</span>;
  return (
    <span
      className={cn("block shrink-0 rounded-full p-[2.5px]", ring === "unseen" ? "story-ring" : "bg-border", className)}
      style={{ width: size, height: size }}
    >
      <span className="block h-full w-full rounded-full bg-background p-[2px]">{inner}</span>
    </span>
  );
}

export function AccountBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      type === "business" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
    )}>
      {type === "business" ? "Business" : "Personal"}
    </span>
  );
}
