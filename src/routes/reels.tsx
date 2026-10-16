import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Heart, Send, Bookmark, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { fetchContent, fetchMyReactions, type Content } from "@/lib/content";
import { UserAvatar } from "@/components/UserAvatar";
import { ConnectButton } from "@/components/ConnectButton";
import { useComments, CommentBox } from "@/components/ContentCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels · SAC Community" },
      { name: "description", content: "Swipe through short vertical videos from the SAC Community." },
      { property: "og:title", content: "SAC Reels" },
      { property: "og:description", content: "Short vertical videos from the community." },
    ],
  }),
  component: () => <RequireAuth><Reels /></RequireAuth>,
});

function Reels() {
  const { userId } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["reels"], queryFn: () => fetchContent({ type: "reel" }) });
  const { data: r } = useQuery({ queryKey: ["reactions", userId], queryFn: () => fetchMyReactions(userId) });
  const [muted, setMuted] = useState(true);
  if (isLoading) return <div className="grid h-[80vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!data?.length) return (
    <div className="grid h-[70vh] place-items-center text-center">
      <div><h2 className="text-2xl font-black">No reels yet</h2>
        <Link to="/create" search={{ type: "reel" }} className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Create the first reel</Link></div>
    </div>
  );
  return (
    <div className="no-scrollbar mx-auto h-[calc(100vh-7.5rem)] max-w-md snap-y snap-mandatory overflow-y-scroll sm:h-[calc(100vh-4rem)]">
      {data.map((c) => <Reel key={c.id} c={c} liked={!!r?.liked.has(c.id)} saved={!!r?.saved.has(c.id)} muted={muted} setMuted={setMuted} />)}
    </div>
  );
}

function Reel({ c, liked, saved, muted, setMuted }: { c: Content; liked: boolean; saved: boolean; muted: boolean; setMuted: (m: boolean) => void }) {
  const { userId } = useAuth();
  const ref = useRef<HTMLVideoElement>(null);
  const [isLiked, setLiked] = useState(liked);
  const [isSaved, setSaved] = useState(saved);
  const [count, setCount] = useState(c.likes?.[0]?.count ?? 0);
  const [open, setOpen] = useState(false);
  const { data: comments } = useComments(c.id, open ? undefined : 5);
  useEffect(() => { setLiked(liked); setSaved(saved); }, [liked, saved]);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.6 });
    io.observe(v); return () => io.disconnect();
  }, []);
  const like = async () => {
    const n = !isLiked; setLiked(n); setCount((x) => x + (n ? 1 : -1));
    const { error } = n ? await supabase.from("likes").insert({ content_id: c.id, user_id: userId! }) : await supabase.from("likes").delete().eq("content_id", c.id).eq("user_id", userId!);
    if (error) toast.error(error.message);
  };
  const save = async () => {
    const n = !isSaved; setSaved(n);
    const { error } = n ? await supabase.from("saves").insert({ content_id: c.id, user_id: userId! }) : await supabase.from("saves").delete().eq("content_id", c.id).eq("user_id", userId!);
    if (error) toast.error(error.message);
  };
  const share = async () => { await navigator.clipboard.writeText(`${location.origin}/c/${c.id}`); toast.success("Link copied"); };

  return (
    <section className="relative h-full snap-start snap-always overflow-hidden bg-black sm:my-2 sm:rounded-2xl">
      {c.media_url && <video ref={ref} src={c.media_url} poster={c.cover_url ?? undefined} loop muted={muted} playsInline className="h-full w-full object-cover" onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())} />}
      <button onClick={() => setMuted(!muted)} className="absolute right-3 top-3 rounded-full bg-background/60 p-2" aria-label="Sound">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-xs font-semibold">
        <button onClick={like} className="flex flex-col items-center gap-1"><Heart className={cn("h-8 w-8", isLiked && "fill-primary text-primary")} />{count}</button>
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1"><span aria-hidden="true" className="text-3xl leading-none">🗣️</span>{c.comments?.[0]?.count ?? 0}</button>
        <button onClick={share}><Send className="h-7 w-7" /></button>
        <button onClick={save}><Bookmark className={cn("h-7 w-7", isSaved && "fill-foreground")} /></button>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent p-4 pr-16">
        <div className="flex items-center gap-2">
          <Link to="/u/$username" params={{ username: c.author.username }} className="flex min-w-0 items-center gap-2">
            <UserAvatar src={c.author.avatar_url} name={c.author.display_name} size={36} />
            <span className="truncate font-semibold">{c.author.username}</span>
          </Link>
          <ConnectButton otherId={c.author_id} />
        </div>
        {c.title && <h3 className="mt-2 font-bold">{c.title}</h3>}
        {c.description && <p className="line-clamp-2 text-sm text-foreground/85">{c.description}</p>}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Comments</SheetTitle></SheetHeader>
          <div className="space-y-2 px-4 pb-4">
            {comments?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {comments?.map((cm) => <p key={cm.id} className="text-sm"><b className="mr-1.5">{cm.author?.username}</b>{cm.body}</p>)}
            <CommentBox contentId={c.id} />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
