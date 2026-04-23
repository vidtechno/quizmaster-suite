import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Shuffle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore quizzes — Quizly" }] }),
  component: ExplorePage,
});

type PublicTest = {
  id: string;
  title: string;
  description: string | null;
  time_limit: number;
  random_enabled: boolean;
  created_at: string;
  creator: { username: string; full_name: string } | null;
  question_count: number;
};

function ExplorePage() {
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tests")
        .select("id, title, description, time_limit, random_enabled, created_at, profiles!tests_creator_id_fkey(username, full_name), questions(count)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      const mapped: PublicTest[] = (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        time_limit: t.time_limit,
        random_enabled: t.random_enabled,
        created_at: t.created_at,
        creator: t.profiles ? { username: t.profiles.username, full_name: t.profiles.full_name } : null,
        question_count: t.questions?.[0]?.count ?? 0,
      }));
      setTests(mapped);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-semibold">Explore public quizzes</h1>
        <p className="mt-2 text-muted-foreground">Take a quiz, climb the leaderboard, learn something new.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No public quizzes yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Link key={t.id} to="/quiz/$id" params={{ id: t.id }} className="group flex flex-col rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold leading-snug">{t.title}</h3>
                {t.random_enabled && <Shuffle className="h-4 w-4 shrink-0 text-accent" />}
              </div>
              {t.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{t.question_count} Q</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{Math.round(t.time_limit / 60)} min</span>
                {t.creator && <span>by @{t.creator.username}</span>}
              </div>
              <div className="mt-auto pt-4">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                  Take quiz <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
