import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { TestDraft, QuestionDraft } from "@/components/QuizEditor";
import { EditorSkeleton } from "@/components/EditorSkeleton";
import { safeMutation } from "@/lib/safe-query";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

const QuizEditor = lazy(() => import("@/components/QuizEditor").then((m) => ({ default: m.QuizEditor })));

export const Route = createFileRoute("/quiz/$id/edit")({
  head: () => ({ meta: [{ title: t.editQuiz.metaTitle }] }),
  component: EditQuizPage,
});

function EditQuizPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestDraft | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [testCode, setTestCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: tt, error } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
        if (error || !tt) {
          toast.error(t.editQuiz.notFound);
          return navigate({ to: "/dashboard" });
        }
        if (tt.creator_id !== user.id) {
          toast.error(t.editQuiz.notYours);
          return navigate({ to: "/dashboard" });
        }

        setTest({
          title: tt.title,
          description: tt.description ?? "",
          time_limit_min: Math.round(tt.time_limit / 60),
          random_enabled: tt.random_enabled,
          max_attempts: tt.max_attempts,
          questions_per_attempt: tt.questions_per_attempt ?? null,
          one_way_mode: (tt as any).one_way_mode ?? false,
        });
        setTestCode(tt.test_code);

        const { data: qs } = await supabase.from("questions").select("*").eq("test_id", id).order("position");
        setQuestions(
          (qs ?? []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer_index: q.correct_answer_index,
            explanation: q.explanation ?? "",
            attempts_count: q.attempts_count ?? 0,
            error_rate: Number(q.error_rate ?? 0),
            time_seconds: q.time_seconds ?? null,
            image_url: q.image_url ?? null,
          })),
        );
      } catch {
        toast.error(t.err.loadFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  async function handleSubmit(td: TestDraft, qs: QuestionDraft[]) {
    if (!user) return;
    try {
      const { error: updErr } = await supabase
        .from("tests")
        .update({
          title: td.title.trim(),
          description: td.description.trim() || null,
          time_limit: Math.max(60, td.time_limit_min * 60),
          random_enabled: td.random_enabled,
          max_attempts: td.max_attempts,
          questions_per_attempt: td.questions_per_attempt,
          one_way_mode: td.one_way_mode,
        } as any)
        .eq("id", id);
      if (updErr) {
        toast.error(t.err.saveFailed);
        return;
      }

      // Replace questions: delete + insert (simple, reliable)
      await safeMutation(() => supabase.from("questions").delete().eq("test_id", id));
      const rows = qs.map((q, idx) => ({
        test_id: id,
        question_text: q.question_text.trim(),
        options: q.options.map((o) => o.trim()),
        correct_answer_index: q.correct_answer_index,
        explanation: (q.explanation ?? "").trim() || null,
        time_seconds: q.time_seconds ?? null,
        image_url: q.image_url ?? null,
        position: idx,
      }));
      const ok2 = await safeMutation(() => supabase.from("questions").insert(rows));
      if (!ok2) return;
      toast.success(t.editQuiz.success);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    }
  }

  if (authLoading || loading || !test) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EditorSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">{t.editQuiz.title}</h1>
      <Suspense fallback={<EditorSkeleton />}>
        <QuizEditor
          initialTest={test}
          initialQuestions={questions}
          submitLabel={t.editQuiz.submit}
          testCode={testCode}
          onSubmit={handleSubmit}
        />
      </Suspense>
    </div>
  );
}
