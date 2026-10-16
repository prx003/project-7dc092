import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Content = Tables<"content"> & {
  author: Tables<"profiles">;
  likes: { count: number }[];
  comments: { count: number }[];
};

export const CONTENT_SELECT = "*, author:profiles!content_author_id_fkey(*), likes(count), comments(count)";

export const TYPE_LABEL: Record<string, string> = {
  post: "Post", reel: "Reel", story: "Story", tweet: "Tweet", event: "Event", ticket: "Ticket", news: "News",
};

export async function fetchContent(opts: { authorId?: string; type?: string; types?: string[]; search?: string; limit?: number } = {}) {
  let q = supabase.from("content").select(CONTENT_SELECT).order("created_at", { ascending: false }).limit(opts.limit ?? 40);
  if (opts.authorId) q = q.eq("author_id", opts.authorId);
  if (opts.type) q = q.eq("type", opts.type as never);
  if (opts.types) q = q.in("type", opts.types as never);
  if (opts.search) q = q.or(`title.ilike.%${opts.search}%,description.ilike.%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Content[];
}

export async function fetchMyReactions(userId: string | null) {
  if (!userId) return { liked: new Set<string>(), saved: new Set<string>() };
  const [l, s] = await Promise.all([
    supabase.from("likes").select("content_id").eq("user_id", userId),
    supabase.from("saves").select("content_id").eq("user_id", userId),
  ]);
  return {
    liked: new Set((l.data ?? []).map((r) => r.content_id)),
    saved: new Set((s.data ?? []).map((r) => r.content_id)),
  };
}
