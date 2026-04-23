import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { QuizEditor, type TestDraft, type QuestionDraft } from "@/components/QuizEditor";
import { safeMutation } from "@/lib/safe-query";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/quiz/new")({
  head: () => ({ meta: [{ title: t.newQuiz.metaTitle }] }),
  component: NewQuizPage,
});

function NewQuizPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  async function handleSubmit(test: TestDraft, questions: QuestionDraft[]) {
    if (!user) return;
    try {
      const { data: created, error } = await supabase
        .from("tests")
        .insert({
          creator_id: user.id,
          title: test.title.trim(),
          description: test.description.trim() || null,
          time_limit: Math.max(60, test.time_limit_min * 60),
          random_enabled: test.random_enabled,
          is_public: test.is_public,
          access_code: test.is_public ? null : test.access_code.trim(),
          max_attempts: test.max_attempts,
        })
        .select("id")
        .single();
      if (error || !created) {
        toast.error(t.err.saveFailed);
        return;
      }

      const rows = questions.map((q, idx) => ({
        test_id: created.id,
        question_text: q.question_text.trim(),
        options: q.options.map((o) => o.trim()),
        correct_answer_index: q.correct_answer_index,
        position: idx,
      }));
      const ok = await safeMutation(() => supabase.from("questions").insert(rows));
      if (!ok) return;
      toast.success(t.newQuiz.success);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    }
  }

  if (loading || !user) return <div className="mx-auto max-w-3xl px-4 py-12">{t.loading}</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">{t.newQuiz.title}</h1>
      <QuizEditor
        initialTest={{ title: "", description: "", time_limit_min: 10, random_enabled: false, is_public: true, access_code: "", max_attempts: 1 }}
        initialQuestions={[]}
        submitLabel={t.newQuiz.submit}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
