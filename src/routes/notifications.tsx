import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · SAC Community" }, { name: "description", content: "Your SAC Community notifications." }, { property: "og:title", content: "Notifications" }, { property: "og:description", content: "Your SAC Community notifications." }] }),
  component: () => <RequireAuth><N /></RequireAuth>,
});

const TEXT: Record<string, string> = { like: "liked your content", comment: "commented on your content", connection_request: "sent you a connection request", connection_accepted: "accepted your connection", message: "sent you a message", registration: "registered for your event", booking_confirmed: "Your booking is reserved" };

function N() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["notifications", userId], queryFn: async () => (await supabase.from("notifications").select("*, actor:profiles!notifications_actor_id_fkey(username)").eq("user_id", userId!).order("created_at", { ascending: false }).limit(50)).data ?? [] });
  useEffect(() => { supabase.from("notifications").update({ read: true }).eq("user_id", userId!).eq("read", false).then(() => qc.invalidateQueries({ queryKey: ["unread"] })); }, [userId, qc]);
  return (
    <div className="mx-auto max-w-xl space-y-2 px-4 py-6">
      <h1 className="text-2xl font-black">Notifications</h1>
      {data.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      {data.map((n) => <div key={n.id} className="rounded-xl border border-border bg-card p-3 text-sm"><b>{n.actor?.username}</b> {TEXT[n.kind] ?? n.kind} <span className="text-muted-foreground">· {timeAgo(n.created_at)}</span></div>)}
    </div>
  );
}
