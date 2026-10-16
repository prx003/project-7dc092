import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Send, Bookmark, CalendarDays, MapPin, Ticket, Newspaper, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";
import { TYPE_LABEL, type Content } from "@/lib/content";
import { AccountBadge, UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

export function useComments(contentId: string, limit?: number) {
  return useQuery({
    queryKey: ["comments", contentId, limit ?? "all"],
    queryFn: async () => {
      let q = supabase.from("comments").select("*, author:profiles!comments_author_id_fkey(username, display_name, avatar_url)").eq("content_id", contentId).order("created_at", { ascending: true });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function CommentBox({ contentId }: { contentId: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!userId) return null;
  return (
    <form
      className="flex items-center gap-2 border-t border-border/60 pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        setBusy(true);
        const { error } = await supabase.from("comments").insert({ content_id: contentId, author_id: userId, body: body.slice(0, 2000) });
        setBusy(false);
        if (error) return toast.error(error.message);
        setText("");
        qc.invalidateQueries({ queryKey: ["comments", contentId] });
        qc.invalidateQueries({ queryKey: ["feed"] });
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" maxLength={2000}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      <button disabled={busy || !text.trim()} className="text-sm font-semibold text-primary disabled:opacity-40">Post</button>
    </form>
  );
}

export function ContentDetails({ c }: { c: Content }) {
  if (c.type !== "event" && c.type !== "ticket") return null;
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-surface p-3 text-sm sm:grid-cols-3">
      {c.starts_at && <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{new Date(c.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}
      {(c.location || c.online_link) && <span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{c.location || "Online"}</span></span>}
      <span className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" />{Number(c.price) > 0 ? `₹${Number(c.price).toFixed(2)}` : "Free"}{c.quantity != null && ` · ${c.quantity} spots`}</span>
    </div>
  );
}

export function ContentCard({ c, liked, saved, compact }: { c: Content; liked: boolean; saved: boolean; compact?: boolean }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [isLiked, setLiked] = useState(liked);
  const [isSaved, setSaved] = useState(saved);
  const [likeCount, setLikeCount] = useState(c.likes?.[0]?.count ?? 0);
  const commentCount = c.comments?.[0]?.count ?? 0;
  const { data: comments } = useComments(c.id, 5);

  const requireAuth = () => { if (!userId) { toast("Sign in to interact"); return false; } return true; };

  const toggleLike = async () => {
    if (!requireAuth()) return;
    const next = !isLiked;
    setLiked(next); setLikeCount((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("likes").insert({ content_id: c.id, user_id: userId! })
      : await supabase.from("likes").delete().eq("content_id", c.id).eq("user_id", userId!);
    if (error) { setLiked(!next); setLikeCount((n) => n + (next ? -1 : 1)); toast.error(error.message); }
  };
  const toggleSave = async () => {
    if (!requireAuth()) return;
    const next = !isSaved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("saves").insert({ content_id: c.id, user_id: userId! })
      : await supabase.from("saves").delete().eq("content_id", c.id).eq("user_id", userId!);
    if (error) { setSaved(!next); toast.error(error.message); } else toast(next ? "Saved" : "Removed from saved");
  };
  const share = async () => {
    const url = `${window.location.origin}/c/${c.id}`;
    try {
      if (navigator.share) await navigator.share({ title: c.title || "SAC Community", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };
  const remove = async () => {
    if (!confirm("Delete this?")) return;
    const { error } = await supabase.from("content").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries();
  };

  const isTweet = c.type === "tweet";

  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-border bg-card">
      <header className="space-y-2 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/u/$username" params={{ username: c.author.username }} className="flex min-w-0 items-center gap-3">
          <UserAvatar src={c.author.avatar_url} name={c.author.display_name} size={42} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold">{c.author.display_name}</span>
              <AccountBadge type={c.author.account_type} />
            </div>
            <div className="truncate text-xs text-muted-foreground">@{c.author.username} · {timeAgo(c.created_at)}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{TYPE_LABEL[c.type]}</span>
          {userId === c.author_id && <button onClick={remove} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
        </div>
        </div>
        {c.title && !isTweet && <h3 className="truncate font-bold leading-tight">{c.title}</h3>}
      </header>

      <div className="space-y-3 px-4">
        {isTweet && c.title && <h3 className="font-bold leading-tight text-xl">{c.title}</h3>}
        {c.description && <p className={cn("whitespace-pre-wrap text-sm text-muted-foreground", isTweet && "text-base text-foreground")}>{c.description}</p>}
        <ContentDetails c={c} />
      </div>

      {(c.media_url || c.cover_url) && (
        <Link to="/c/$id" params={{ id: c.id }} className="mt-3 block bg-black/40">
          {c.media_kind === "video" ? (
            <video src={c.media_url!} poster={c.cover_url ?? undefined} controls playsInline className={cn("w-full object-contain", c.type === "reel" ? "max-h-[560px]" : "max-h-[520px]")} onClick={(e) => e.preventDefault()} />
          ) : (
            <img src={(c.media_url || c.cover_url)!} alt={c.title} loading="lazy" className="max-h-[560px] w-full object-cover" />
          )}
        </Link>
      )}

      <div className="px-4 pt-3">
        {c.type === "news" && (
          <Link to="/c/$id" params={{ id: c.id }} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Newspaper className="h-4 w-4" />Read full article</Link>
        )}
        {(c.type === "event" || c.type === "ticket") && (
          <Link to="/c/$id" params={{ id: c.id }} className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
            <Ticket className="h-4 w-4" />{Number(c.price) > 0 ? "Get tickets" : "Register"}
          </Link>
        )}
        <div className="flex items-center gap-5 py-1">
          <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm transition active:scale-90" aria-label="Like">
            <Heart className={cn("h-6 w-6", isLiked && "fill-primary text-primary")} />{likeCount}
          </button>
          <Link to="/c/$id" params={{ id: c.id }} className="flex items-center gap-1.5 text-sm" aria-label="Comments"><span aria-hidden="true" className="text-2xl leading-none">🗣️</span>{commentCount}</Link>
          <button onClick={share} aria-label="Share"><Send className="h-6 w-6" /></button>
          <button onClick={toggleSave} className="ml-auto" aria-label="Save"><Bookmark className={cn("h-6 w-6", isSaved && "fill-foreground")} /></button>
        </div>
      </div>

      {!compact && (
        <div className="space-y-1.5 px-4 pb-4 pt-1">
          {comments?.map((cm) => (
            <p key={cm.id} className="text-sm">
              <Link to="/u/$username" params={{ username: cm.author?.username ?? "" }} className="mr-1.5 font-semibold">{cm.author?.username}</Link>
              <span className="text-foreground/90">{cm.body}</span>
            </p>
          ))}
          {commentCount > 5 && (
            <Link to="/c/$id" params={{ id: c.id }} className="block text-sm text-muted-foreground hover:text-foreground">View all {commentCount} comments</Link>
          )}
          <CommentBox contentId={c.id} />
        </div>
      )}
    </article>
  );
}
