import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { TYPE_LABEL } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>) => ({ type: typeof s.type === "string" ? s.type : "post" }),
  head: () => ({ meta: [{ title: "Create · SAC Community" }, { name: "description", content: "Share something with SAC Community." }, { property: "og:title", content: "Create on SAC" }, { property: "og:description", content: "Share something with SAC Community." }] }),
  component: () => <RequireAuth><Create /></RequireAuth>,
});

function Create() {
  const { type } = Route.useSearch();
  const { userId } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", body: "", location: "", starts_at: "", price: "0", quantity: "", category: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const biz = ["event", "ticket", "news"].includes(type);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type !== "tweet" && type !== "story" && !f.title.trim()) return toast.error("Title is required");
    if ((type === "reel" || type === "story") && !file) return toast.error("Please add a photo or video");
    setBusy(true);
    try {
      const m = file ? await uploadMedia(userId!, file) : null;
      const isCover = biz && m;
      const { error } = await supabase.from("content").insert({
        author_id: userId!, type: type as never, title: f.title.trim(), description: f.description.trim(), body: f.body || null,
        media_url: isCover ? null : m?.url ?? null, media_kind: isCover ? null : m?.kind ?? null, cover_url: isCover ? m.url : null,
        category: f.category || null, location: f.location || null, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
        price: Number(f.price) || 0, quantity: f.quantity ? Number(f.quantity) : null,
      });
      if (error) throw error;
      toast.success("Published!");
      qc.invalidateQueries();
      nav({ to: type === "reel" ? "/reels" : "/" });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 px-4 py-6">
      <h1 className="text-2xl font-black">Create {TYPE_LABEL[type] ?? "Post"}</h1>
      <Input placeholder={type === "story" ? "Text on story (optional)" : "Title"} value={f.title} onChange={set("title")} maxLength={150} />
      <Textarea placeholder={type === "story" ? "Caption" : "Description"} value={f.description} onChange={set("description")} maxLength={2000} />
      {type === "story" && <Input placeholder="Sticker emoji (e.g. 🔥)" value={f.category} onChange={set("category")} maxLength={4} />}
      {type === "news" && <><Input placeholder="Category" value={f.category} onChange={set("category")} /><Textarea rows={8} placeholder="Full article" value={f.body} onChange={set("body")} /></>}
      {(type === "event" || type === "ticket") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} />
          <Input placeholder="Location or online link" value={f.location} onChange={set("location")} />
          <Input type="number" min={0} placeholder="Price (₹)" value={f.price} onChange={set("price")} />
          <Input type="number" min={1} placeholder="Available quantity" value={f.quantity} onChange={set("quantity")} />
        </div>
      )}
      {type !== "tweet" || true ? <Input type="file" accept={type === "reel" ? "video/*" : "image/*,video/*"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /> : null}
      {file && (file.type.startsWith("video") ? <video src={URL.createObjectURL(file)} controls className="max-h-80 w-full rounded-xl" /> : <img src={URL.createObjectURL(file)} alt="" className="max-h-80 w-full rounded-xl object-cover" />)}
      <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>{busy ? "Publishing…" : "Publish"}</Button>
    </form>
  );
}
