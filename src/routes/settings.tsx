import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · SAC Community" }, { name: "description", content: "Manage your SAC Community profile." }, { property: "og:title", content: "Settings" }, { property: "og:description", content: "Manage your SAC Community profile." }] }),
  component: () => <RequireAuth><div className="mx-auto max-w-xl px-4 py-10 text-center"><h1 className="text-2xl font-black">Settings</h1><p className="mt-2 text-muted-foreground">Profile editing is coming soon.</p></div></RequireAuth>,
});
