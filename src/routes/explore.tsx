import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Shuffle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { PaginationBar } from "@/components/PaginationBar";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: t.explore.metaTitle }] }),
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tests")
          .select("id, title, description, time_limit, random_enabled, created_at, creator_id, questions(count)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) {
          toast.error(t.err.loadFailed);
          setLoading(false);
          return;
        }
        const rows = data ?? [];
        const creatorIds = Array.from(new Set(rows.map((r: any) => r.creator_id).filter(Boolean)));
        let profileMap: Record<string, { username: string; full_name: string }> = {};
        if (creatorIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, username, full_name")
            .in("id", creatorIds);
          (profs ?? []).forEach((p: any) => {
            profileMap[p.id] = { username: p.username, full_name: p.full_name };
          });
        }
        const mapped: PublicTest[] = rows.map((tt: any) => ({
          id: tt.id,
          title: tt.title,
          description: tt.description,
          time_limit: tt.time_limit,
          random_enabled: tt.random_enabled,
          created_at: tt.created_at,
          creator: profileMap[tt.creator_id] ?? null,
          question_count: tt.questions?.[0]?.count ?? 0,
        }));
        setTests(mapped);
      } catch {
        toast.error(t.err.network);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <div className="mb-8 sm:mb-10">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t.explore.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.explore.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">{t.explore.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((tt) => (
            <Link
              key={tt.id}
              to="/quiz/$id"
              params={{ id: tt.id }}
              className="group flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold leading-snug">{tt.title}</h3>
                {tt.random_enabled && <Shuffle className="h-4 w-4 shrink-0 text-accent" />}
              </div>
              {tt.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{tt.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {t.explore.qShort(tt.question_count)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {t.explore.minShort(Math.round(tt.time_limit / 60))}
                </span>
                {tt.creator && (
                  <span>
                    {t.explore.by} @{tt.creator.username}
                  </span>
                )}
              </div>
              <div className="mt-auto pt-4">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                  {t.explore.take} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
