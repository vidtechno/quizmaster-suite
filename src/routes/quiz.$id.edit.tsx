import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { QuizEditor, type TestDraft, type QuestionDraft } from "@/components/QuizEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/quiz/$id/edit")({
  head: () => ({ meta: [{ title: "Edit quiz — Quizly" }] }),
  component: EditQuizPage,
});

function EditQuizPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestDraft | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t, error } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
      if (error || !t) {
        toast.error("Quiz not found");
        return navigate({ to: "/dashboard" });
      }
      if (t.creator_id !== user.id) {
        toast.error("Not your quiz");
        return navigate({ to: "/dashboard" });
      }
      setTest({
        title: t.title,
        description: t.description ?? "",
        time_limit_min: Math.round(t.time_limit / 60),
        random_enabled: t.random_enabled,
        is_public: t.is_public,
        access_code: t.access_code ?? "",
        max_attempts: t.max_attempts,
      });
      const { data: qs } = await supabase.from("questions").select("*").eq("test_id", id).order("position");
      setQuestions(
        (qs ?? []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer_index: q.correct_answer_index,
        }))
      );
      setLoading(false);
    })();
  }, [id, user, navigate]);

  async function handleSubmit(t: TestDraft, qs: QuestionDraft[]) {
    if (!user) return;
    if (!t.title.trim()) { toast.error("Add a title"); return; }
    if (qs.some((q) => !q.question_text.trim() || q.options.some((o) => !o.trim()))) {
      toast.error("Fill in every question and option"); return;
    }
    if (!t.is_public && !t.access_code.trim()) { toast.error("Private quizzes need an access code"); return; }

    const { error: tErr } = await supabase
      .from("tests")
      .update({
        title: t.title.trim(),
        description: t.description.trim() || null,
        time_limit: Math.max(60, t.time_limit_min * 60),
        random_enabled: t.random_enabled,
        is_public: t.is_public,
        access_code: t.is_public ? null : t.access_code.trim(),
        max_attempts: t.max_attempts,
      })
      .eq("id", id);
    if (tErr) { toast.error(tErr.message); return; }

    // Replace questions: delete + insert (simple, reliable)
    await supabase.from("questions").delete().eq("test_id", id);
    const rows = qs.map((q, idx) => ({
      test_id: id,
      question_text: q.question_text.trim(),
      options: q.options.map((o) => o.trim()),
      correct_answer_index: q.correct_answer_index,
      position: idx,
    }));
    const { error: qErr } = await supabase.from("questions").insert(rows);
    if (qErr) { toast.error(qErr.message); return; }
    toast.success("Saved!");
    navigate({ to: "/dashboard" });
  }

  if (authLoading || loading || !test) return <div className="mx-auto max-w-3xl px-4 py-12">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-semibold">Edit quiz</h1>
      <QuizEditor initialTest={test} initialQuestions={questions} submitLabel="Save changes" onSubmit={handleSubmit} />
    </div>
  );
}
