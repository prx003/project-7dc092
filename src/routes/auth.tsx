import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · SAC Community" },
      { name: "description", content: "Join SAC Community with a personal or business account." },
      { property: "og:title", content: "Join SAC Community" },
      { property: "og:description", content: "Create a personal or business account on SAC Community." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error("Username: 3–24 letters, numbers or _");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name, username, account_type: accountType } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
      <div className="hidden md:block">
        <Logo size={72} />
        <h1 className="mt-6 text-5xl font-black leading-[1.05]">Where people & businesses <span className="text-primary">connect.</span></h1>
        <p className="mt-4 max-w-sm text-muted-foreground">Share posts, reels and stories. Discover events, grab tickets, and follow the news from businesses near you.</p>
      </div>
      <form onSubmit={submit} className="animate-rise space-y-4 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="md:hidden"><Logo size={48} /></div>
        <h2 className="text-2xl font-black">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
        {mode === "up" && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              {(["personal", "business"] as const).map((t) => (
                <button type="button" key={t} onClick={() => setAccountType(t)}
                  className={cn("rounded-lg py-2 text-sm font-semibold capitalize transition", accountType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
              ))}
            </div>
            <Input required placeholder={accountType === "business" ? "Business name" : "Full name"} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <Input required placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
          </>
        )}
        <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <Button type="button" variant="outline" className="h-11 w-full rounded-full" onClick={google}>Continue with Google</Button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "in" ? "New to SAC?" : "Already have an account?"}{" "}
          <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Create account" : "Sign in"}</button>
        </p>
      </form>
    </div>
  );
}
