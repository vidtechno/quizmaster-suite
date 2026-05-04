import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/lib/locale";
import { Trophy, Medal, Crown } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Yetakchilar jadvali — MegaPanel.uz" }] }),
  component: LeaderboardPage,
});

type Row = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  completed_count: number;
  avg_pct: number;
  total_score: number;
};

function LeaderboardPage() {
  const { tr } = useLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_global_leaderboard", { _limit: 100 }).then(({ data }) => {
      setRows(((data as any) || []) as Row[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
          <Trophy className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">{tr.leaderboardTitle}</h1>
          <p className="text-sm text-muted-foreground">{tr.leaderboardSub}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Yuklanmoqda…</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Hali natijalar yo'q</Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.user_id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
              <RankBadge rank={i + 1} />
              <Avatar className="h-10 w-10">
                <AvatarImage src={r.avatar_url || undefined} />
                <AvatarFallback>{(r.full_name || "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{r.avg_pct}%</div>
                <div className="text-xs text-muted-foreground">{r.completed_count} {tr.attempts.toLowerCase()}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
        <Crown className="h-5 w-5" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-400/20 text-slate-500">
        <Medal className="h-5 w-5" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-500">
        <Medal className="h-5 w-5" />
      </span>
    );
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}
