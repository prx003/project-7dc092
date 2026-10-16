import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_SELECT, type Content } from "@/lib/content";
import { demoHighlights } from "@/lib/demo-content";
import { StoryViewer, type Group } from "./Stories";
import { cn } from "@/lib/utils";

type Highlight = { id: string; label: string; cover: string | null; demo?: boolean; group: Group };

export function Highlights({ authorId, username, displayName, avatarUrl, isSelf }: {
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Highlight | null>(null);
  const { data: stories = [] } = useQuery({
    queryKey: ["highlights", authorId],
    enabled: !!authorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select(CONTENT_SELECT)
        .eq("type", "story")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as Content[];
    },
  });

  const real = useMemo<Highlight[]>(() => {
    const byKey = new Map<string, Content[]>();
    for (const s of stories) {
      const key = s.category?.trim() || "Stories";
      const list = byKey.get(key) ?? [];
      list.push(s);
      byKey.set(key, list);
    }
    return [...byKey.entries()].slice(0, 5).map(([label, list]) => ({
      id: `hl-${label}`,
      label,
      cover: list[0].media_url || list[0].cover_url || null,
      group: { authorId, author: { username, display_name: displayName, avatar_url: avatarUrl }, stories: list, unseen: true },
    }));
  }, [stories, authorId, username, displayName, avatarUrl]);

  const shown: Highlight[] = real.length ? real : demoHighlights;
  const toCreate = () => navigate({ to: "/create", search: { type: "story" } });

  return (
    <>
      <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-1">
        {isSelf && (
          <button onClick={toCreate} className="flex w-16 shrink-0 flex-col items-center gap-1.5" aria-label="New highlight">
            <span className="grid h-[62px] w-[62px] place-items-center rounded-full border border-dashed border-border bg-surface text-muted-foreground">
              <Plus className="h-6 w-6" />
            </span>
            <span className="w-full truncate text-center text-xs text-muted-foreground">New</span>
          </button>
        )}
        {shown.map((h) => (
          <button
            key={h.id}
            onClick={() => setOpen(h)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition active:scale-95"
            aria-label={`Open ${h.label} highlights`}
          >
            <span className={cn("block rounded-full p-[2.5px]", h.demo ? "story-ring opacity-80" : "story-ring")} style={{ width: 64, height: 64 }}>
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background p-[2px]">
                {h.cover ? (
                  <img src={h.cover} alt={h.label} className="h-full w-full rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-lg font-display font-bold text-muted-foreground">{h.label.slice(0, 2).toUpperCase()}</span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-xs">{h.label}{h.demo && <span className="text-muted-foreground"> · Demo</span>}</span>
          </button>
        ))}
      </div>
      {open && (
        <StoryViewer
          groups={[open.group]}
          start={0}
          onClose={() => setOpen(null)}
          onCreate={() => { setOpen(null); toCreate(); }}
        />
      )}
    </>
  );
}
