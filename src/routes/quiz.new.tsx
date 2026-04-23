import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { QuizEditor, type TestDraft, type QuestionDraft } from "@/components/QuizEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/quiz/new")({
  head: () => ({ meta: [{ title: "New quiz — Quizly" }] }),
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
    if (!test.title.trim()) return toast.error("Add a title");
    if (questions.some((q) => !q.question_text.trim() || q.options.some((o) => !o.trim()))) {
      return toast.error("Fill in every question and option");
    }
    if (!test.is_public && !test.access_code.trim()) return toast.error("Private quizzes need an access code");

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
    if (error || !created) return toast.error(error?.message ?? "Failed to create quiz");

    const rows = questions.map((q, idx) => ({
      test_id: created.id,
      question_text: q.question_text.trim(),
      options: q.options.map((o) => o.trim()),
      correct_answer_index: q.correct_answer_index,
      position: idx,
    }));
    const { error: qErr } = await supabase.from("questions").insert(rows);
    if (qErr) return toast.error(qErr.message);
    toast.success("Quiz created!");
    navigate({ to: "/dashboard" });
  }

  if (loading || !user) return <div className="mx-auto max-w-3xl px-4 py-12">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-semibold">Create a new quiz</h1>
      <QuizEditor
        initialTest={{ title: "", description: "", time_limit_min: 10, random_enabled: false, is_public: true, access_code: "", max_attempts: 1 }}
        initialQuestions={[]}
        submitLabel="Create quiz"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
