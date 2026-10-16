import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Home, Compass, Bell, Menu, Film, Ticket, LogOut, Settings, X } from "lucide-react";
import { Wordmark } from "./Logo";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const linkCls = "relative grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground";
const active = { className: "!text-primary bg-secondary" };

export function Header() {
  const { profile, userId } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: unread = 0, refetch } = useQuery({
    queryKey: ["unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);
      return count ?? 0;
    },
  });
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("notif-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refetch]);

  const nav = (
    <>
      <Link to="/" className={linkCls} activeProps={active} activeOptions={{ exact: true }} aria-label="Home"><Home className="h-5 w-5" /></Link>
      <Link to="/reels" className={linkCls} activeProps={active} aria-label="Reels"><Film className="h-5 w-5" /></Link>
      <Link to="/explore" className={linkCls} activeProps={active} aria-label="Explore"><Compass className="h-5 w-5" /></Link>
      <Link to="/notifications" className={linkCls} activeProps={active} aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
      </Link>
      <Link to="/messages" className={linkCls} activeProps={active} aria-label="Messages"><span aria-hidden="true" className="text-lg leading-none">🗣️</span></Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-5">
        <Link to="/" className="min-w-0"><Wordmark /></Link>
        {userId ? (
          <>
            <nav className="hidden items-center gap-1 sm:flex">{nav}</nav>
            <div className="flex items-center gap-1">
              {profile && (
                <Link to="/u/$username" params={{ username: profile.username }} aria-label="Profile" className="rounded-full p-0.5 transition hover:ring-2 hover:ring-primary">
                  <UserAvatar src={profile.avatar_url} name={profile.display_name} size={34} />
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger className={linkCls + " hidden sm:grid"} aria-label="Menu"><Menu className="h-5 w-5" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => navigate({ to: "/bookings" })}><Ticket className="mr-2 h-4 w-4" />My bookings</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button className={linkCls + " sm:hidden"} onClick={() => setOpen((v) => !v)} aria-label="Menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </>
        ) : (
          <Link to="/auth" className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign in</Link>
        )}
      </div>
      {userId && (
        <div className="flex items-center justify-around border-t border-border/60 px-2 py-1.5 sm:hidden">{nav}</div>
      )}
      {open && userId && (
        <div className="space-y-1 border-t border-border/60 p-3 sm:hidden" onClick={() => setOpen(false)}>
          <Link to="/explore" className="block rounded-lg px-3 py-2 hover:bg-secondary">Search</Link>
          <Link to="/bookings" className="block rounded-lg px-3 py-2 hover:bg-secondary">My bookings</Link>
          <Link to="/settings" className="block rounded-lg px-3 py-2 hover:bg-secondary">Settings</Link>
          <button className="block w-full rounded-lg px-3 py-2 text-left text-primary hover:bg-secondary" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}>Sign out</button>
        </div>
      )}
    </header>
  );
}
