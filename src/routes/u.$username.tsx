import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { fetchContent, TYPE_LABEL } from "@/lib/content";
import { AccountBadge, UserAvatar } from "@/components/UserAvatar";
import { ConnectButton } from "@/components/ConnectButton";
import { CreateMenu } from "@/components/CreateMenu";
import { Highlights } from "@/components/Highlights";
import { ConnectionsList } from "@/components/ConnectionsList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$username")({
  head: () => ({ meta: [{ title: "Profile & Connections · SAC Community" }, { name: "description", content: "Explore profiles, story highlights and connections on SAC Community." }, { property: "og:title", content: "SAC Community profile & connections" }, { property: "og:description", content: "Explore profiles, story highlights and connect with people on SAC Community." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <RequireAuth><Profile /></RequireAuth>,
});

function Profile() {
  const { username } = Route.useParams();
  const { userId } = useAuth();
  const [tab, setTab] = useState("all");
  const [peopleTab, setPeopleTab] = useState<"connected" | "connect">("connected");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const { data: p } = useQuery({ queryKey: ["profile", username], queryFn: async () => (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data });
  const { data: items = [] } = useQuery({ queryKey: ["profile-content", p?.id], enabled: !!p, queryFn: () => p ? fetchContent({ authorId: p.id, limit: 100 }) : [] });
  const { data: count = 0 } = useQuery({ queryKey: ["connections-count", p?.id], enabled: !!p, queryFn: async () => {
    if (!p) return 0;
    return (await supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${p.id},addressee_id.eq.${p.id}`)).count ?? 0;
  } });
  if (!p) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  const tabs = p.account_type === "business" ? ["all", "post", "reel", "tweet", "story", "event", "ticket", "news"] : ["all", "post", "reel", "tweet", "story"];
  const shown = tab === "all" ? items : items.filter((i) => i.type === tab);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col items-center text-center">
        <UserAvatar src={p.avatar_url} name={p.display_name} size={96} />
        <h1 className="mt-3 text-2xl font-black">{p.display_name}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">@{p.username}<AccountBadge type={p.account_type} /></div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Button variant="ghost" className="h-auto gap-1 p-0" onClick={() => { setPeopleTab("connected"); setPeopleOpen(true); }}><b>{count}</b> Connections</Button>
          <Button variant="ghost" className="h-auto p-0" onClick={() => { setPeopleTab("connect"); setPeopleOpen(true); }}>Connect</Button>
          <Button variant="ghost" className="h-auto p-0" onClick={() => { setPeopleTab("connected"); setPeopleOpen(true); }}>Connected</Button>
          <span><b>{items.length}</b> Posts</span>
        </div>
        {p.bio && <p className="mt-3 max-w-md text-sm">{p.bio}</p>}
        {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="mt-1 text-sm text-primary">{p.website}</a>}
        <div className="mt-4">{p.id === userId ? <CreateMenu /> : <ConnectButton otherId={p.id} size="default" />}</div>
      </div>
      <Highlights authorId={p.id} username={p.username} displayName={p.display_name} avatarUrl={p.avatar_url} isSelf={p.id === userId} />
      <Dialog open={peopleOpen} onOpenChange={setPeopleOpen}>
        <DialogContent className="max-h-[80dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Connections · {count}</DialogTitle></DialogHeader>
          <div role="tablist" aria-label="People" className="flex gap-1">
            <Button role="tab" aria-selected={peopleTab === "connected"} aria-controls="profile-people" variant={peopleTab === "connected" ? "secondary" : "ghost"} size="sm" onClick={() => setPeopleTab("connected")}>Connected</Button>
            <Button role="tab" aria-selected={peopleTab === "connect"} aria-controls="profile-people" variant={peopleTab === "connect" ? "secondary" : "ghost"} size="sm" onClick={() => setPeopleTab("connect")}>Connect</Button>
          </div>
        <div id="profile-people" role="tabpanel" aria-label={peopleTab === "connected" ? "Connected people" : "People to connect with"}>
          <ConnectionsList profileId={p.id} discover={peopleTab === "connect"} />
        </div>
        </DialogContent>
      </Dialog>
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-border">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("shrink-0 border-b-2 px-3 py-2 text-sm capitalize", tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>{t === "all" ? "All" : TYPE_LABEL[t] + "s"}</button>)}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {shown.map((c) => (
          <Link key={c.id} to="/c/$id" params={{ id: c.id }} className="relative aspect-[3/4] overflow-hidden rounded bg-card">
             {c.media_kind === "video" && c.media_url ? <video src={c.media_url} muted className="h-full w-full object-cover" /> : (c.media_url || c.cover_url) ? <img src={c.media_url || c.cover_url || undefined} alt="" className="h-full w-full object-cover" /> : <p className="p-2 text-xs">{c.title}</p>}
            <span className="absolute left-1 top-1 rounded bg-background/80 px-1.5 text-[10px] text-primary">{TYPE_LABEL[c.type]}</span>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">Nothing here yet.</p>}
    </div>
  );
}
