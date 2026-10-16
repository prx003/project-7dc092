import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchContent, TYPE_LABEL } from "@/lib/content";
import { RequireAuth } from "@/lib/auth";
import { AccountBadge, UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): { q?: string; focus?: number } => ({ q: typeof s.q === "string" ? s.q : undefined, focus: s.focus ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Explore · SAC Community" },
      { name: "description", content: "Search people, businesses, posts, reels, events, tickets and news." },
      { property: "og:title", content: "Explore SAC Community" },
      { property: "og:description", content: "Discover people, businesses and events." },
    ],
  }),
  component: () => <RequireAuth><Explore /></RequireAuth>,
});

const FILTERS = ["all", "people", "business", "post", "reel", "tweet", "event", "ticket", "news"] as const;

function Explore() {
  const { q: initial, focus } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [term, setTerm] = useState(initial ?? "");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim().replace(/[%,()]/g, "")), 300); return () => clearTimeout(t); }, [q]);

  const showPeople = filter === "all" || filter === "people" || filter === "business";
  const people = useQuery({
    queryKey: ["search-people", term, filter],
    enabled: showPeople,
    queryFn: async () => {
      let qq = supabase.from("profiles").select("*").limit(20);
      if (term) qq = qq.or(`username.ilike.%${term}%,display_name.ilike.%${term}%,business_category.ilike.%${term}%`);
      if (filter === "business") qq = qq.eq("account_type", "business");
      return (await qq).data ?? [];
    },
  });
  const contentType = !["all", "people", "business"].includes(filter) ? filter : undefined;
  const content = useQuery({
    queryKey: ["search-content", term, contentType],
    enabled: filter !== "people" && filter !== "business",
    queryFn: () => fetchContent({ search: term || undefined, type: contentType, types: contentType ? undefined : ["post", "reel", "tweet", "event", "ticket", "news"], limit: 60 }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus={!!focus} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SAC Community"
          className="h-12 w-full rounded-full border border-input bg-card pl-12 pr-4 outline-none focus:border-primary" />
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm capitalize transition",
            filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {f === "people" ? "People" : f === "business" ? "Businesses" : f === "all" ? "All" : TYPE_LABEL[f] + "s"}
          </button>
        ))}
      </div>

      {showPeople && (people.data?.length ?? 0) > 0 && (
        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2">
          {people.data!.map((p) => (
            <Link key={p.id} to="/u/$username" params={{ username: p.username }} className="flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition hover:border-primary">
              <UserAvatar src={p.avatar_url} name={p.display_name} size={64} />
              <span className="w-full truncate text-sm font-semibold">{p.display_name}</span>
              <AccountBadge type={p.account_type} />
            </Link>
          ))}
        </div>
      )}

      {content.isLoading && <div className="mt-6 grid grid-cols-3 gap-1">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded bg-card" />)}</div>}
      {content.data && content.data.length === 0 && <p className="mt-10 text-center text-muted-foreground">Nothing found.</p>}
      <div className="mt-6 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {content.data?.map((c) => (
          <Link key={c.id} to="/c/$id" params={{ id: c.id }} className="group relative aspect-square overflow-hidden rounded-lg bg-card">
            {c.media_url || c.cover_url ? (
              c.media_kind === "video" && !c.cover_url
                ? <video src={c.media_url!} muted className="h-full w-full object-cover" />
                : <img src={(c.cover_url || c.media_url)!} alt={c.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
            ) : (
              <div className="flex h-full flex-col justify-end bg-gradient-to-br from-accent to-card p-3">
                <p className="line-clamp-4 text-sm font-semibold">{c.title || c.description}</p>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-primary">{TYPE_LABEL[c.type]}</span>
            {c.media_kind === "video" && <Play className="absolute right-2 top-2 h-4 w-4 fill-foreground" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
