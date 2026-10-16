import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { ConnectButton } from "@/components/ConnectButton";

type Person = { id: string; username: string; display_name: string; avatar_url: string | null };
type Row = { id: string; requester_id: string; addressee_id: string; requester: Person | null; addressee: Person | null };

const PERSON = "id, username, display_name, avatar_url";

export function ConnectionsList({ profileId, discover = false }: { profileId: string; discover?: boolean }) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["connections-list", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select(`id, requester_id, addressee_id, requester:profiles!connections_requester_id_fkey(${PERSON}), addressee:profiles!connections_addressee_id_fkey(${PERSON})`)
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
        .limit(50);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const { data: suggestions = [], isLoading: suggestionsLoading, error: suggestionsError } = useQuery({
    queryKey: ["connection-suggestions", profileId],
    enabled: discover,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(PERSON).neq("id", profileId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Person[];
    },
  });

  if (isLoading || (discover && suggestionsLoading)) return <p className="py-6 text-center text-sm text-muted-foreground">Loading people…</p>;
  if (error || (discover && suggestionsError)) return <p role="alert" className="py-6 text-center text-sm text-destructive">Couldn't load people. Please try again.</p>;

  const connected = rows.map((r) => (r.requester_id === profileId ? r.addressee : r.requester)).filter(Boolean) as Person[];
  const connectedIds = new Set(connected.map((p) => p.id));
  const people = discover ? suggestions.filter((p) => !connectedIds.has(p.id)) : connected;

  if (people.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">{discover ? "No new people to connect with yet." : "No connections yet."}</p>;

  return (
    <ul className="divide-y divide-border">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 py-2.5">
          <Link to="/u/$username" params={{ username: person.username }} className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar src={person.avatar_url} name={person.display_name} size={44} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{person.display_name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
            </span>
          </Link>
          <ConnectButton otherId={person.id} />
        </li>
      ))}
    </ul>
  );
}
