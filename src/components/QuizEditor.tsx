import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Check } from "lucide-react";

export type QuestionDraft = {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
};

export type TestDraft = {
  title: string;
  description: string;
  time_limit_min: number;
  random_enabled: boolean;
  is_public: boolean;
  access_code: string;
  max_attempts: number;
};

type Props = {
  initialTest: TestDraft;
  initialQuestions: QuestionDraft[];
  submitLabel: string;
  onSubmit: (test: TestDraft, questions: QuestionDraft[]) => Promise<void>;
};

export function QuizEditor({ initialTest, initialQuestions, submitLabel, onSubmit }: Props) {
  const [test, setTest] = useState<TestDraft>(initialTest);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.length ? initialQuestions : [{ question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }]
  );
  const [saving, setSaving] = useState(false);

  function updateQ(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((qs) => qs.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? value : o)) } : q)));
  }
  function addQ() {
    setQuestions((qs) => [...qs, { question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(test, questions);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-semibold">Quiz settings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={test.title} onChange={(e) => setTest({ ...test, title: e.target.value })} placeholder="e.g. Intro to Algebra — Chapter 3" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={test.description} onChange={(e) => setTest({ ...test, description: e.target.value })} placeholder="Briefly describe what this quiz covers." />
          </div>
          <div>
            <Label htmlFor="time">Time limit (minutes)</Label>
            <Input id="time" type="number" min={1} max={240} value={test.time_limit_min} onChange={(e) => setTest({ ...test, time_limit_min: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <Label htmlFor="attempts">Max attempts per user</Label>
            <Input id="attempts" type="number" min={1} max={50} value={test.max_attempts} onChange={(e) => setTest({ ...test, max_attempts: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="cursor-pointer">Randomize order</Label>
              <p className="text-xs text-muted-foreground">Shuffle questions and options each attempt.</p>
            </div>
            <Switch checked={test.random_enabled} onCheckedChange={(v) => setTest({ ...test, random_enabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="cursor-pointer">Public</Label>
              <p className="text-xs text-muted-foreground">Listed on Explore + leaderboard.</p>
            </div>
            <Switch checked={test.is_public} onCheckedChange={(v) => setTest({ ...test, is_public: v })} />
          </div>
          {!test.is_public && (
            <div className="md:col-span-2">
              <Label htmlFor="code">Access code</Label>
              <Input id="code" value={test.access_code} onChange={(e) => setTest({ ...test, access_code: e.target.value })} placeholder="Give this code to your students" />
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Questions ({questions.length})</h2>
          <Button variant="outline" size="sm" onClick={addQ}><Plus className="mr-2 h-4 w-4" />Add question</Button>
        </div>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Question {qi + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => removeQ(qi)} disabled={questions.length === 1} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={q.question_text}
                onChange={(e) => updateQ(qi, { question_text: e.target.value })}
                placeholder="What's the question?"
                className="mb-4"
              />
              <p className="mb-2 text-xs font-medium text-muted-foreground">Options · click the check to mark the correct answer</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQ(qi, { correct_answer_index: oi })}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${q.correct_answer_index === oi ? "border-success bg-success text-success-foreground" : "border-input hover:bg-muted"}`}
                      aria-label={`Mark option ${oi + 1} correct`}
                    >
                      {q.correct_answer_index === oi ? <Check className="h-4 w-4" /> : <span className="text-xs">{String.fromCharCode(65 + oi)}</span>}
                    </button>
                    <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={saving} className="shadow-elegant">
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
