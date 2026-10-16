import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { CONTENT_SELECT, fetchMyReactions, type Content } from "@/lib/content";
import { ContentCard, useComments, CommentBox } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/c/$id")({
  head: () => ({ meta: [{ title: "Post · SAC Community" }, { name: "description", content: "View this post on SAC Community." }, { property: "og:title", content: "SAC Community post" }, { property: "og:description", content: "View this post on SAC Community." }] }),
  component: () => <RequireAuth><Detail /></RequireAuth>,
});

function Detail() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const { data: c, isLoading } = useQuery({ queryKey: ["content", id], queryFn: async () => (await supabase.from("content").select(CONTENT_SELECT).eq("id", id).maybeSingle()).data as unknown as Content | null });
  const { data: r } = useQuery({ queryKey: ["reactions", userId], queryFn: () => fetchMyReactions(userId) });
  const { data: comments } = useComments(id);
  const [qty, setQty] = useState(1);
  if (isLoading || !r) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!c) return <p className="p-10 text-center">Not found.</p>;
  const book = async () => {
    const { data, error } = await supabase.from("bookings").insert({ content_id: c.id, user_id: userId!, quantity: qty }).select("reference").single();
    if (error) return toast.error(error.message);
    toast.success(`Reserved! Reference ${data.reference}`);
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 py-5">
      <ContentCard c={c} liked={r.liked.has(c.id)} saved={r.saved.has(c.id)} compact />
      {c.type === "news" && c.body && <article className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 leading-relaxed">{c.body}</article>}
      {(c.type === "event" || c.type === "ticket") && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, +e.target.value)))} className="w-16 rounded-lg border border-input bg-transparent px-2 py-1" />
          <Button variant="hero" onClick={book}>{Number(c.price) > 0 ? "Reserve tickets" : "Register"}</Button>
          {Number(c.price) > 0 && <span className="text-xs text-muted-foreground">Payment coming soon — reservation only.</span>}
        </div>
      )}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">All comments</h3>
        {comments?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments?.map((cm) => <p key={cm.id} className="text-sm"><b className="mr-1.5">{cm.author?.username}</b>{cm.body}</p>)}
        <CommentBox contentId={c.id} />
      </div>
    </div>
  );
}
