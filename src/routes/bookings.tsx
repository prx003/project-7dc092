import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My bookings · SAC Community" }, { name: "description", content: "Your event registrations and tickets." }, { property: "og:title", content: "My bookings" }, { property: "og:description", content: "Your event registrations and tickets." }] }),
  component: () => <RequireAuth><B /></RequireAuth>,
});

function B() {
  const { userId } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["bookings", userId], queryFn: async () => (await supabase.from("bookings").select("*, content(title)").eq("user_id", userId!).order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="mx-auto max-w-xl space-y-2 px-4 py-6">
      <h1 className="text-2xl font-black">My bookings</h1>
      {data.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
      {data.map((b) => <div key={b.id} className="rounded-xl border border-border bg-card p-3 text-sm"><b>{b.content?.title}</b> · {b.quantity}× · <span className="text-primary">{b.reference}</span> · {b.payment_status}</div>)}
    </div>
  );
}
