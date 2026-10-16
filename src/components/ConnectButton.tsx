import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, UserCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function useConnection(otherId: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["connection", userId, otherId],
    enabled: !!userId && userId !== otherId,
    queryFn: async () => {
      const { data } = await supabase.from("connections").select("*")
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
        .maybeSingle();
      return data;
    },
  });
}

export function ConnectButton({ otherId, size = "sm" }: { otherId: string; size?: "sm" | "default" }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: conn } = useConnection(otherId);
  if (!userId || userId === otherId) return null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["connection"] }); qc.invalidateQueries({ queryKey: ["connections-count"] }); qc.invalidateQueries({ queryKey: ["connections-list"] }); };

  const run = async (p: PromiseLike<{ error: { message: string } | null }>, msg: string) => {
    const { error } = await p;
    if (error) return toast.error(error.message);
    toast.success(msg); refresh();
  };

  if (!conn)
    return <Button size={size} variant="hero" onClick={() => run(supabase.from("connections").insert({ requester_id: userId, addressee_id: otherId }), "Connection request sent")}><UserPlus />Connect</Button>;
  if (conn.status === "pending" && conn.addressee_id === userId)
    return (
      <div className="flex gap-2">
        <Button size={size} variant="hero" onClick={() => run(supabase.from("connections").update({ status: "accepted" }).eq("id", conn.id), "Connected")}>Accept</Button>
        <Button size={size} variant="secondary" onClick={() => run(supabase.from("connections").delete().eq("id", conn.id), "Request declined")}>Decline</Button>
      </div>
    );
  if (conn.status === "pending")
    return <Button size={size} variant="secondary" onClick={() => run(supabase.from("connections").delete().eq("id", conn.id), "Request cancelled")}><Clock />Pending</Button>;
  return (
    <Button size={size} variant="secondary" onClick={() => confirm("Disconnect?") && run(supabase.from("connections").delete().eq("id", conn.id), "Disconnected")}>
      <UserCheck className="text-primary" />Connected
    </Button>
  );
}
