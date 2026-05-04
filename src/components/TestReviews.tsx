import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Review = { id: string; user_id: string; rating: number; comment: string | null; created_at: string; author?: string };

export function TestReviews({ testId }: { testId: string }) {
  const { user } = useAuth();
  const { tr } = useLocale();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("test_reviews")
      .select("*")
      .eq("test_id", testId)
      .order("created_at", { ascending: false });
    const list = (data || []) as Review[];
    setReviews(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,username").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p.full_name || p.username));
      setAuthors(map);
    }
    if (user) {
      const mine = list.find((r) => r.user_id === user.id) || null;
      setMyReview(mine);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment || "");
      }
    }
  };

  useEffect(() => {
    load();
    if (!user) return setCanReview(false);
    supabase
      .from("test_attempts")
      .select("id")
      .eq("test_id", testId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(1)
      .then(({ data }) => setCanReview((data || []).length > 0));
  }, [testId, user]);

  const submit = async () => {
    if (!user) return;
    const payload = { test_id: testId, user_id: user.id, rating, comment: comment.trim() || null };
    const { error } = await supabase.from("test_reviews").upsert(payload, { onConflict: "test_id,user_id" });
    if (error) return toast.error(error.message);
    toast.success(tr.reviewSaved);
    load();
  };

  const del = async () => {
    if (!myReview) return;
    await supabase.from("test_reviews").delete().eq("id", myReview.id);
    setMyReview(null);
    setComment("");
    setRating(5);
    load();
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">{tr.reviews}</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {canReview && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{tr.yourRating}:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} type="button">
                  <Star className={`h-6 w-6 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea placeholder={tr.reviewPh} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button onClick={submit} className="rounded-full bg-gradient-hero shadow-glow">
              {tr.submit}
            </Button>
            {myReview && (
              <Button variant="ghost" onClick={del}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {reviews.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">{tr.noReviews}</Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{authors[r.user_id] || "…"}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm">{r.comment}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
