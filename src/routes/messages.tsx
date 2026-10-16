import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, AtSign } from "lucide-react";
import { RequireAuth, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchContent } from "@/lib/content";
import { ContentCard } from "@/components/ContentCard";
import { UserAvatar } from "@/components/UserAvatar";
import { useReactions } from "@/routes/index";
import { timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages · SAC Community" }, { name: "description", content: "Your private messages and tweets." }, { property: "og:title", content: "Messages" }, { property: "og:description", content: "Your private messages and tweets." }] }),
  component: () => <RequireAuth><MessagesPage /></RequireAuth>,
});

type Conversation = {
  partnerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastBody: string;
  lastAt: string;
  unread: number;
};

function MessagesPage() {
  const [tab, setTab] = useState<"messages" | "tweets">("messages");
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-black">Messages</h1>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setTab("messages")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "messages" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />Messages
        </button>
        <button
          onClick={() => setTab("tweets")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "tweets" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AtSign className="h-4 w-4" />Tweets
        </button>
      </div>
      {tab === "messages" ? <Conversations /> : <Tweets />}
    </div>
  );
}

function Conversations() {
  const { userId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, created_at, read_at, sender_id, recipient_id, sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url), recipient:profiles!messages_recipient_id_fkey(username, display_name, avatar_url)")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const byPartner = new Map<string, Conversation>();
      for (const m of data) {
        const mine = m.sender_id === userId;
        const partner = mine ? m.recipient : m.sender;
        if (!partner) continue;
        const existing = byPartner.get(partner.username);
        const unreadInc = !mine && !m.read_at ? 1 : 0;
        if (!existing) {
          byPartner.set(partner.username, {
            partnerId: partner.username,
            username: partner.username,
            displayName: partner.display_name,
            avatarUrl: partner.avatar_url,
            lastBody: m.body,
            lastAt: m.created_at,
            unread: unreadInc,
          });
        } else {
          existing.unread += unreadInc;
        }
      }
      return [...byPartner.values()];
    },
  });

  if (isLoading) return <div className="mt-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />)}</div>;
  if (error) return <p className="mt-5 rounded-xl bg-destructive/15 p-4 text-sm">Couldn't load conversations. {(error as Error).message}</p>;
  if (!data?.length) return <p className="mt-6 text-center text-sm text-muted-foreground">No conversations yet. Start one from someone's profile.</p>;

  return (
    <ul className="mt-5 space-y-3">
      {data.map((c) => (
        <li key={c.username}>
          <Link to="/u/$username" params={{ username: c.username }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-surface">
            <UserAvatar src={c.avatarUrl} name={c.displayName} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{c.displayName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.lastAt)}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{c.lastBody}</p>
            </div>
            {c.unread > 0 && <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Tweets() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tweets"], queryFn: () => fetchContent({ type: "tweet", limit: 40 }) });
  const { data: r } = useReactions();
  if (isLoading) return <div className="mt-5 space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />)}</div>;
  if (error) return <p className="mt-5 rounded-xl bg-destructive/15 p-4 text-sm">Couldn't load tweets. {(error as Error).message}</p>;
  if (!data?.length) return <p className="mt-6 text-center text-sm text-muted-foreground">No tweets yet. Share your first one from the + button on your profile.</p>;
  return (
    <div className="mt-5 space-y-5">
      {r && data.map((c) => <ContentCard key={c.id} c={c} liked={r.liked.has(c.id)} saved={r.saved.has(c.id)} />)}
    </div>
  );
}
