import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, X, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CONTENT_SELECT, type Content } from "@/lib/content";
import { timeAgo } from "@/lib/media";
import { UserAvatar } from "./UserAvatar";
import { Button } from "./ui/button";
import { createPortal } from "react-dom";
import { demoStories } from "@/lib/demo-content";

export type Group = { authorId: string; author: Pick<Content["author"], "username" | "display_name" | "avatar_url">; stories: Pick<Content, "id" | "title" | "description" | "category" | "media_url" | "media_kind" | "created_at">[]; unseen: boolean; demo?: boolean };

export function useStoryGroups() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["stories", userId],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await supabase.from("content").select(CONTENT_SELECT).eq("type", "story").gte("created_at", since).order("created_at", { ascending: true });
      if (error) throw error;
      const views = userId ? (await supabase.from("story_views").select("content_id").eq("user_id", userId)).data ?? [] : [];
      const seen = new Set(views.map((v) => v.content_id));
      const map = new Map<string, Group>();
      for (const s of data as unknown as Content[]) {
        const g = map.get(s.author_id) ?? { authorId: s.author_id, author: s.author, stories: [], unseen: false };
        g.stories.push(s);
        if (!seen.has(s.id) && s.author_id !== userId) g.unseen = true;
        map.set(s.author_id, g);
      }
      const groups = [...map.values()].sort((a, b) => Number(b.unseen) - Number(a.unseen));
      const mine = groups.findIndex((g) => g.authorId === userId);
      if (mine > 0) groups.unshift(groups.splice(mine, 1)[0]);
      return groups;
    },
  });
}

export function StoriesRail() {
  const { profile, userId } = useAuth();
  const { data: realGroups = [] } = useStoryGroups();
  const groups = useMemo(() => [...realGroups, ...demoStories], [realGroups]);
  const [viewerGroups, setViewerGroups] = useState<Group[] | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const navigate = useNavigate();
  const clamp = (x: number, y: number) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - 76)),
    y: Math.max(8, Math.min(y, window.innerHeight - 76)),
  });

  useEffect(() => {
    setPosition(clamp(window.innerWidth - 84, window.innerHeight - 160));
    const resize = () => setPosition((p) => p ? clamp(p.x, p.y) : p);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (!position) return null;
  return createPortal(<>
    <Button
      variant="ghost"
      aria-label="View stories"
      title="Stories"
      className="fixed z-40 h-[68px] w-[68px] touch-none select-none rounded-full bg-background/90 p-1 shadow-lg backdrop-blur-md cursor-grab active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        suppressClick.current = false;
        drag.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.hypot(dx, dy) > 5) { d.moved = true; suppressClick.current = true; }
        if (d.moved) setPosition(clamp(d.left + dx, d.top + dy));
      }}
      onPointerUp={(e) => {
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        const others = groups.filter((g) => g.authorId !== userId);
        setViewerGroups(others.length ? others : groups);
      }}
    >
      <UserAvatar src={profile?.avatar_url} name={profile?.display_name} size={60} ring="unseen" />
    </Button>
    {viewerGroups && viewerGroups.length > 0 && <StoryViewer groups={viewerGroups} start={0} onClose={() => setViewerGroups(null)} onCreate={() => { setViewerGroups(null); navigate({ to: "/create", search: { type: "story" } }); }} />}
  </>, document.body);
}

export function StoryViewer({ groups, start, onClose, onCreate }: { groups: Group[]; start: number; onClose: () => void; onCreate: () => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const g = groups[gi];
  const s = g?.stories[si];
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const next = useMemo(() => () => {
    if (si < g.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); return; }
    onClose();
  }, [si, gi, g, groups.length, onClose]);
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(0); }
  };

  useEffect(() => { setProgress(0); }, [gi, si]);
  useEffect(() => {
    if (!s || !userId || g.demo) return;
    supabase.from("story_views").upsert({ content_id: s.id, user_id: userId }).then(() => qc.invalidateQueries({ queryKey: ["stories"] }));
  }, [s, userId, qc, g.demo]);
  useEffect(() => {
    if (paused || s?.media_kind === "video") return;
    const t = setInterval(() => setProgress((p) => { if (p >= 100) { next(); return 0; } return p + 2; }), 100);
    return () => clearInterval(t);
  }, [paused, next, s]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!s) return null;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !reply.trim()) return;
    const { error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: g.authorId, body: `Replied to your story: ${reply.trim()}`.slice(0, 4000) });
    if (error) return toast.error(error.message);
    setReply(""); setPaused(false); toast.success("Reply sent");
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Story viewer" className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (dx < -50) next(); if (dx > 50) prev(); touch.current = null; }}>
      <Button variant="secondary" size="icon" onClick={onCreate} className="absolute right-16 top-4 z-20 rounded-full" aria-label="Add your story"><Plus /></Button>
      <Button variant="secondary" size="icon" onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full" aria-label="Close"><X className="h-5 w-5" /></Button>
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-card sm:h-[90vh] sm:rounded-3xl">
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
          {g.stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/25">
              <div className="h-full bg-foreground transition-[width] duration-100" style={{ width: i < si ? "100%" : i === si ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="absolute left-3 right-14 top-7 z-10 flex items-center gap-2">
          <UserAvatar src={g.author.avatar_url} name={g.author.display_name} size={34} />
          {g.demo ? <span className="truncate text-sm font-semibold">{g.author.username}</span> : <Link to="/u/$username" params={{ username: g.author.username }} onClick={onClose} className="truncate text-sm font-semibold">{g.author.username}</Link>}
          <span className="shrink-0 text-xs text-muted-foreground">{g.demo ? "Demo" : timeAgo(s.created_at)}</span>
        </div>
        <div className="relative flex flex-1 items-center justify-center bg-gradient-primary">
          {s.media_url && (s.media_kind === "video"
            ? <video key={s.id} src={s.media_url} autoPlay playsInline className="h-full w-full object-contain" onEnded={next} onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100)} />
            : <img src={s.media_url} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />)}
          {(s.title || s.category) && (
            <div className="pointer-events-none absolute inset-x-6 top-1/3 text-center">
              {s.category && <div className="mb-2 text-6xl">{s.category}</div>}
              {s.title && <p className="inline rounded-lg bg-background/70 px-3 py-1 font-display text-2xl font-bold [box-decoration-break:clone]">{s.title}</p>}
            </div>
          )}
          {s.description && <p className="absolute inset-x-4 bottom-4 rounded-xl bg-background/70 p-3 text-sm">{s.description}</p>}
          <Button variant="ghost" className="absolute inset-y-0 left-0 h-full w-1/3 justify-start rounded-none hover:bg-transparent" onClick={prev} aria-label="Previous"><ChevronLeft className="rounded-full bg-background/50" /></Button>
          <Button variant="ghost" className="absolute inset-y-0 right-0 h-full w-1/3 justify-end rounded-none hover:bg-transparent" onClick={next} aria-label="Next"><ChevronRight className="rounded-full bg-background/50" /></Button>
        </div>
        {userId && userId !== g.authorId && !g.demo && (
          <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-border p-3">
            <input value={reply} onFocus={() => setPaused(true)} onBlur={() => !reply && setPaused(false)} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${g.author.username}…`} className="min-w-0 flex-1 rounded-full border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-primary" />
            <Button type="submit" size="icon" className="rounded-full" aria-label="Send"><Send className="h-4 w-4" /></Button>
          </form>
        )}
      </div>
    </div>
  );
}
