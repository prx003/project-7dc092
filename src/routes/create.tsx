import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, MapPin, Music, Users, Tag, ChevronRight, X, Check, Type as TypeIcon, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { TYPE_LABEL } from "@/lib/content";
import { ASPECTS, AUDIENCES, FILTERS, TRACKS, filterCss } from "@/lib/composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { type: string; edit?: string } => ({
    type: typeof s.type === "string" ? s.type : "post",
    ...(typeof s.edit === "string" ? { edit: s.edit } : {}),
  }),
  head: () => ({ meta: [{ title: "Create · SAC Community" }, { name: "description", content: "Create posts, reels and stories on SAC Community." }, { property: "og:title", content: "Create on SAC" }, { property: "og:description", content: "Create posts, reels and stories on SAC Community." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <RequireAuth><CreateSwitch /></RequireAuth>,
});

const MEDIA_TYPES = ["post", "reel", "story"];

function CreateSwitch() {
  const { type } = Route.useSearch();
  return MEDIA_TYPES.includes(type) ? <Composer /> : <SimpleCreate />;
}

type Step = "select" | "edit" | "details";

function Composer() {
  const { type, edit } = Route.useSearch();
  const { userId, profile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(edit ? "details" : "select");
  const [file, setFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [existingKind, setExistingKind] = useState<string | null>(null);
  const [filter, setFilter] = useState("normal");
  const [adj, setAdj] = useState({ brightness: 1, contrast: 1, saturate: 1 });
  const [savedFilter, setSavedFilter] = useState<string | null>(null);
  const [aspect, setAspect] = useState<string>(type === "post" ? "1/1" : "9/16");
  const [editTab, setEditTab] = useState<"filters" | "adjust">("filters");
  const [f, setF] = useState({ title: "", description: "", location: "", tagged: "", alt: "", overlay: "" });
  const [music, setMusic] = useState<{ title: string; artist: string } | null>(null);
  const [audience, setAudience] = useState("everyone");
  const [hideLikes, setHideLikes] = useState(false);
  const [commentsOff, setCommentsOff] = useState(false);
  const [sheet, setSheet] = useState<null | "music" | "audience" | "location" | "tag" | "advanced">(null);
  const [busy, setBusy] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : existingUrl), [file, existingUrl]);
  const isVideo = file ? file.type.startsWith("video") : existingKind === "video";
  const css = savedFilter ?? filterCss(filter, adj);

  useEffect(() => {
    if (!edit) return;
    supabase.from("content").select("*").eq("id", edit).maybeSingle().then(({ data }) => {
      if (!data) return;
      setExistingUrl(data.media_url); setExistingKind(data.media_kind);
      setSavedFilter(data.filter); if (data.aspect) setAspect(data.aspect);
      setF({ title: data.title, description: data.description, location: data.location ?? "", tagged: data.tagged ?? "", alt: data.alt_text ?? "", overlay: data.category ?? "" });
      if (data.music_title) setMusic({ title: data.music_title, artist: data.music_artist ?? "" });
      setAudience(data.audience); setHideLikes(data.hide_likes); setCommentsOff(data.comments_off);
    });
  }, [edit]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    if (type === "reel" && !fl.type.startsWith("video")) return toast.error("Reels need a video");
    setFile(fl); setSavedFilter(null); setStep("edit");
  };

  const share = async () => {
    if (!edit && !file) return toast.error("Please add a photo or video");
    setBusy(true);
    try {
      const fields = {
        title: f.title.trim(), description: f.description.trim(), location: f.location.trim() || null,
        tagged: f.tagged.trim() || null, alt_text: f.alt.trim() || null, category: type === "story" ? f.overlay || null : null,
        music_title: music?.title ?? null, music_artist: music?.artist ?? null, audience,
        hide_likes: hideLikes, comments_off: commentsOff, filter: css === "none" ? null : css, aspect,
      };
      if (edit) {
        const { error } = await supabase.from("content").update(fields).eq("id", edit);
        if (error) throw error;
        toast.success("Changes saved");
      } else {
        const m = await uploadMedia(userId!, file!);
        const { error } = await supabase.from("content").insert({
          ...fields, author_id: userId!, type: type as never, media_url: m.url, media_kind: m.kind,
          expires_at: type === "story" ? new Date(Date.now() + 864e5).toISOString() : null,
        });
        if (error) throw error;
        toast.success(type === "story" ? "Added to your story" : `${TYPE_LABEL[type]} shared`);
      }
      qc.invalidateQueries();
      nav({ to: type === "reel" ? "/reels" : profile ? "/u/$username" : "/", params: { username: profile?.username ?? "" } as never });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  const back = () => step === "details" && !edit ? setStep("edit") : step === "edit" ? setStep("select") : history.back();
  const label = edit ? `Edit ${TYPE_LABEL[type].toLowerCase()}` : step === "select" ? `New ${TYPE_LABEL[type].toLowerCase()}` : step === "edit" ? "Edit" : type === "story" ? "Your story" : `New ${TYPE_LABEL[type].toLowerCase()}`;

  const Preview = ({ small }: { small?: boolean }) => previewUrl ? (
    <div className={cn("relative mx-auto overflow-hidden rounded-xl bg-muted", small ? "h-20 w-16 shrink-0" : "w-full max-w-md")} style={small ? undefined : { aspectRatio: aspect === "original" ? undefined : aspect }}>
      {isVideo ? <video src={previewUrl} autoPlay={!small} muted loop playsInline className="h-full w-full object-cover" style={{ filter: css }} />
        : <img src={previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: css }} />}
      {!small && type === "story" && f.overlay && <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg bg-background/70 px-3 py-2 text-center text-xl font-bold">{f.overlay}</p>}
      {!small && music && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs"><Music className="h-3 w-3" />{music.title} · {music.artist}</span>}
    </div>
  ) : null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={back} aria-label="Back"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="font-bold">{label}</h1>
        {step === "edit" ? <button className="font-semibold text-primary" onClick={() => setStep("details")}>Next</button>
          : step === "details" ? <button className="font-semibold text-primary disabled:opacity-50" disabled={busy} onClick={share}>{busy ? "Sharing…" : edit ? "Done" : "Share"}</button>
          : <span className="w-6" />}
      </header>

      {step === "select" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <ImagePlus className="h-20 w-20 text-muted-foreground" strokeWidth={1} />
          <p className="text-lg">{type === "reel" ? "Pick a video for your reel" : "Drag photos and videos here"}</p>
          <Button variant="hero" onClick={() => fileRef.current?.click()}>Select from device</Button>
          <input ref={fileRef} type="file" hidden accept={type === "reel" ? "video/*" : "image/*,video/*"} onChange={pick} />
        </div>
      )}

      {step === "edit" && (
        <div className="flex-1 space-y-4 p-4">
          <Preview />
          {type === "post" && (
            <div className="flex justify-center gap-2">
              {ASPECTS.map((a) => <Button key={a.id} size="sm" variant={aspect === a.id ? "secondary" : "ghost"} onClick={() => setAspect(a.id)}>{a.label}</Button>)}
            </div>
          )}
          <div className="flex border-b border-border">
            {(["filters", "adjust"] as const).map((t) => <button key={t} onClick={() => setEditTab(t)} className={cn("flex-1 border-b-2 py-2 text-sm font-semibold capitalize", editTab === t ? "border-foreground" : "border-transparent text-muted-foreground")}>{t === "filters" ? "Filters" : "Adjustments"}</button>)}
          </div>
          {editTab === "filters" ? (
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {FILTERS.map((fl) => (
                <button key={fl.id} onClick={() => setFilter(fl.id)} className="flex shrink-0 flex-col items-center gap-1 text-xs">
                  <div className={cn("h-20 w-20 overflow-hidden rounded-md border-2", filter === fl.id ? "border-primary" : "border-transparent")}>
                    {isVideo ? <video src={previewUrl!} muted className="h-full w-full object-cover" style={{ filter: fl.css }} /> : <img src={previewUrl!} alt="" className="h-full w-full object-cover" style={{ filter: fl.css }} />}
                  </div>
                  <span className={cn(filter === fl.id && "font-semibold")}>{fl.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {(["brightness", "contrast", "saturate"] as const).map((k) => (
                <div key={k} className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="capitalize">{k === "saturate" ? "Saturation" : k}</span><span className="text-muted-foreground">{Math.round((adj[k] - 1) * 100)}</span></div>
                  <Slider min={0.5} max={1.5} step={0.01} value={[adj[k]]} onValueChange={([v]) => setAdj({ ...adj, [k]: v })} />
                </div>
              ))}
            </div>
          )}
          {type === "story" && <Input placeholder="Add text to your story" value={f.overlay} onChange={(e) => setF({ ...f, overlay: e.target.value })} maxLength={80} />}
        </div>
      )}

      {step === "details" && (
        <div className="flex-1">
          <div className="flex gap-3 border-b border-border p-4">
            <UserAvatar src={profile?.avatar_url ?? null} name={profile?.display_name ?? ""} size={36} />
            <div className="flex-1 space-y-2">
              <Input placeholder={type === "story" ? "Title (optional)" : "Add a title…"} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={150} className="border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0" />
              <Textarea placeholder="Write a caption… use #hashtags and @mentions" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2200} rows={4} className="resize-none border-0 px-0 shadow-none focus-visible:ring-0" />
              <p className="text-right text-xs text-muted-foreground">{f.description.length}/2200</p>
            </div>
            <Preview small />
          </div>
          {type === "story" && edit && <div className="border-b border-border p-4"><Input placeholder="Text on story" value={f.overlay} onChange={(e) => setF({ ...f, overlay: e.target.value })} /></div>}
          <Row icon={Music} label="Add music" value={music ? `${music.title} · ${music.artist}` : undefined} onClick={() => setSheet("music")} />
          <Row icon={MapPin} label="Add location" value={f.location || undefined} onClick={() => setSheet("location")} />
          {type !== "story" && <Row icon={Tag} label="Tag people" value={f.tagged || undefined} onClick={() => setSheet("tag")} />}
          <Row icon={Users} label="Audience" value={AUDIENCES.find((a) => a.id === audience)?.label} onClick={() => setSheet("audience")} />
          {type !== "story" && <Row icon={Eye} label="Advanced settings" onClick={() => setSheet("advanced")} />}
          <div className="p-4"><Button variant="hero" className="h-11 w-full" disabled={busy} onClick={share}>{busy ? "Sharing…" : edit ? "Save changes" : type === "story" ? "Share to story" : "Share"}</Button></div>
        </div>
      )}

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
          {sheet === "music" && <MusicPicker value={music} onPick={(m) => { setMusic(m); setSheet(null); }} />}
          {sheet === "location" && (
            <TextSheet title="Add location" placeholder="Search a place, e.g. Hyderabad" value={f.location} icon={MapPin}
              suggestions={["Hyderabad, India", "Mumbai, India", "Bengaluru, India", "Chennai, India", "Delhi, India", "Goa, India"]}
              onDone={(v) => { setF({ ...f, location: v }); setSheet(null); }} />
          )}
          {sheet === "tag" && (
            <TextSheet title="Tag people" placeholder="@username, @friend" value={f.tagged} icon={Tag}
              onDone={(v) => { setF({ ...f, tagged: v }); setSheet(null); }} />
          )}
          {sheet === "audience" && (
            <>
              <SheetHeader><SheetTitle>Audience</SheetTitle></SheetHeader>
              <div className="space-y-1 px-4 pb-6">
                {AUDIENCES.map((a) => (
                  <button key={a.id} onClick={() => { setAudience(a.id); setSheet(null); }} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted">
                    <div><p className="font-semibold">{a.label}</p><p className="text-sm text-muted-foreground">{a.hint}</p></div>
                    {audience === a.id && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
          {sheet === "advanced" && (
            <>
              <SheetHeader><SheetTitle>Advanced settings</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <label className="flex items-center justify-between gap-4"><span><b className="block">Hide like count</b><span className="text-sm text-muted-foreground">Only you will see the total likes.</span></span><Switch checked={hideLikes} onCheckedChange={setHideLikes} /></label>
                <label className="flex items-center justify-between gap-4"><span><b className="block">Turn off commenting</b><span className="text-sm text-muted-foreground">You can change this later.</span></span><Switch checked={commentsOff} onCheckedChange={setCommentsOff} /></label>
                <div className="space-y-2"><b className="block">Alt text</b><Textarea placeholder="Describe your photo for people with visual impairments" value={f.alt} onChange={(e) => setF({ ...f, alt: e.target.value })} maxLength={300} /></div>
                <Button className="w-full" onClick={() => setSheet(null)}>Done</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick }: { icon: typeof Music; label: string; value?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left hover:bg-muted/50">
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{label}</span>
      {value && <span className="max-w-[45%] truncate text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function MusicPicker({ value, onPick }: { value: { title: string; artist: string } | null; onPick: (m: { title: string; artist: string } | null) => void }) {
  const [q, setQ] = useState("");
  const list = TRACKS.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <SheetHeader><SheetTitle>Music</SheetTitle></SheetHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input placeholder="Search music" value={q} onChange={(e) => setQ(e.target.value)} />
        {value && <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => onPick(null)}><X className="h-4 w-4" />Remove music</Button>}
        {list.map((t) => (
          <button key={t.title} onClick={() => onPick(t)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground"><Music className="h-5 w-5" /></span>
            <span className="flex-1"><b className="block text-sm">{t.title}</b><span className="text-xs text-muted-foreground">{t.artist}</span></span>
            {value?.title === t.title && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
        {q && !list.length && <Button variant="secondary" className="w-full" onClick={() => onPick({ title: q, artist: "Original audio" })}>Use “{q}”</Button>}
      </div>
    </>
  );
}

function TextSheet({ title, placeholder, value, suggestions, icon: Icon, onDone }: { title: string; placeholder: string; value: string; suggestions?: string[]; icon: typeof Music; onDone: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <>
      <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input autoFocus placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onDone(v.trim())} />
        {suggestions?.filter((s) => s.toLowerCase().includes(v.toLowerCase())).map((s) => (
          <button key={s} onClick={() => onDone(s)} className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-muted"><Icon className="h-4 w-4 text-muted-foreground" />{s}</button>
        ))}
        <div className="flex gap-2 pt-2">
          {value && <Button variant="ghost" className="flex-1" onClick={() => onDone("")}>Remove</Button>}
          <Button className="flex-1" onClick={() => onDone(v.trim())}>Done</Button>
        </div>
      </div>
    </>
  );
}

function SimpleCreate() {
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
    if (type !== "tweet" && !f.title.trim()) return toast.error("Title is required");
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
      nav({ to: "/" });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-black"><TypeIcon className="h-6 w-6" />Create {TYPE_LABEL[type] ?? "Post"}</h1>
      <Input placeholder="Title" value={f.title} onChange={set("title")} maxLength={150} />
      <Textarea placeholder="Description" value={f.description} onChange={set("description")} maxLength={2000} />
      {type === "news" && <><Input placeholder="Category" value={f.category} onChange={set("category")} /><Textarea rows={8} placeholder="Full article" value={f.body} onChange={set("body")} /></>}
      {(type === "event" || type === "ticket") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} />
          <Input placeholder="Location or online link" value={f.location} onChange={set("location")} />
          <Input type="number" min={0} placeholder="Price (₹)" value={f.price} onChange={set("price")} />
          <Input type="number" min={1} placeholder="Available quantity" value={f.quantity} onChange={set("quantity")} />
        </div>
      )}
      <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>{busy ? "Publishing…" : "Publish"}</Button>
    </form>
  );
}
