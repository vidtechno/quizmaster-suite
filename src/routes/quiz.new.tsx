import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safe-query";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { EditorSkeleton } from "@/components/EditorSkeleton";
import type { TestDraft, QuestionDraft, GroupOption } from "@/components/QuizEditor";

const QuizEditor = lazy(() => import("@/components/QuizEditor").then((m) => ({ default: m.QuizEditor })));

export const Route = createFileRoute("/quiz/new")({
  head: () => ({ meta: [{ title: t.newQuiz.metaTitle }] }),
  component: NewQuizPage,
});

function NewQuizPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await safeQuery(
        () => supabase.from("groups").select("id, name").eq("creator_id", user.id).order("created_at", { ascending: false }),
        { fallback: [] as { id: string; name: string }[] },
      );
      setGroups(data ?? []);
      setGroupsLoading(false);
    })();
  }, [user]);

  async function handleSubmit(test: TestDraft, questions: QuestionDraft[]) {
    if (!user) return;
    try {
      let accessCode: string | null = null;
      if (!test.is_public) {
        const { data: codeData, error: codeErr } = await supabase.rpc("generate_access_code");
        if (codeErr || !codeData) {
          toast.error(t.err.saveFailed);
          return;
        }
        accessCode = codeData as string;
      }

      const { data: created, error } = await supabase
        .from("tests")
        .insert({
          creator_id: user.id,
          title: test.title.trim(),
          description: test.description.trim() || null,
          time_limit: Math.max(60, test.time_limit_min * 60),
          random_enabled: test.random_enabled,
          is_public: test.is_public,
          access_code: accessCode,
          // Legacy single-group column kept null; we use test_groups junction now.
          group_id: null,
          max_attempts: test.max_attempts,
          questions_per_attempt: test.questions_per_attempt,
        })
        .select("id")
        .single();
      if (error || !created) {
        toast.error(t.err.saveFailed);
        return;
      }

      // Attach groups via test_groups junction
      if (!test.is_public && test.group_ids.length > 0) {
        const linkRows = test.group_ids.map((gid) => ({ test_id: created.id, group_id: gid }));
        const { error: linkErr } = await supabase.from("test_groups").insert(linkRows);
        if (linkErr) {
          toast.error(t.err.saveFailed);
          return;
        }
      }

      const rows = questions.map((q, idx) => ({
        test_id: created.id,
        question_text: q.question_text.trim(),
        options: q.options.map((o) => o.trim()),
        correct_answer_index: q.correct_answer_index,
        position: idx,
      }));
      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) {
        toast.error(t.err.saveFailed);
        return;
      }
      toast.success(t.newQuiz.success);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    }
  }

  if (loading || !user || groupsLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EditorSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">{t.newQuiz.title}</h1>
      <Suspense fallback={<EditorSkeleton />}>
        <QuizEditor
          initialTest={{
            title: "",
            description: "",
            time_limit_min: 10,
            random_enabled: false,
            is_public: true,
            access_code: "",
            max_attempts: 1,
            group_ids: [],
            questions_per_attempt: null,
          }}
          initialQuestions={[]}
          submitLabel={t.newQuiz.submit}
          groups={groups}
          onSubmit={handleSubmit}
        />
      </Suspense>
    </div>
  );
}
