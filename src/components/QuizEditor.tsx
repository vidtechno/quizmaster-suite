import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { HelpHint } from "@/components/HelpHint";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

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

type FieldErrors = {
  title?: boolean;
  accessCode?: boolean;
  questions: Array<{ text?: boolean; options?: boolean[] }>;
};

const errBorder = "border-destructive ring-1 ring-destructive/40 focus-visible:ring-destructive";

export function QuizEditor({ initialTest, initialQuestions, submitLabel, onSubmit }: Props) {
  const [test, setTest] = useState<TestDraft>(initialTest);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.length ? initialQuestions : [{ question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }],
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({ questions: [] });

  function clearError(path: () => void) {
    path();
  }

  function updateQ(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    if (patch.question_text !== undefined) {
      setErrors((e) => {
        const qErrs = [...e.questions];
        if (qErrs[idx]) qErrs[idx] = { ...qErrs[idx], text: false };
        return { ...e, questions: qErrs };
      });
    }
  }
  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? value : o)) } : q)),
    );
    setErrors((e) => {
      const qErrs = [...e.questions];
      if (qErrs[qIdx]?.options) {
        const opts = [...(qErrs[qIdx].options ?? [])];
        opts[oIdx] = false;
        qErrs[qIdx] = { ...qErrs[qIdx], options: opts };
      }
      return { ...e, questions: qErrs };
    });
  }
  function addQ() {
    setQuestions((qs) => [...qs, { question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    setErrors((e) => ({ ...e, questions: e.questions.filter((_, i) => i !== idx) }));
  }

  function validate(): boolean {
    const newErrs: FieldErrors = { questions: questions.map(() => ({})) };
    let firstInvalidId: string | null = null;

    if (!test.title.trim()) {
      newErrs.title = true;
      if (!firstInvalidId) firstInvalidId = "title";
    }
    if (!test.is_public && !test.access_code.trim()) {
      newErrs.accessCode = true;
      if (!firstInvalidId) firstInvalidId = "code";
    }

    questions.forEach((q, qi) => {
      const qe: { text?: boolean; options?: boolean[] } = {};
      if (!q.question_text.trim()) {
        qe.text = true;
        if (!firstInvalidId) firstInvalidId = `q-${qi}`;
      }
      const optErrs = q.options.map((o) => !o.trim());
      if (optErrs.some(Boolean)) {
        qe.options = optErrs;
        if (!firstInvalidId) {
          const oi = optErrs.findIndex(Boolean);
          firstInvalidId = `q-${qi}-opt-${oi}`;
        }
      }
      newErrs.questions[qi] = qe;
    });

    setErrors(newErrs);

    const hasError =
      newErrs.title ||
      newErrs.accessCode ||
      newErrs.questions.some((q) => q.text || q.options?.some(Boolean));

    if (hasError) {
      if (newErrs.title || newErrs.accessCode) {
        toast.error(newErrs.title ? t.validate.needTitle : t.validate.needCode);
      } else {
        toast.error(t.validate.needFields);
      }
      if (firstInvalidId) {
        setTimeout(() => {
          const el = document.getElementById(firstInvalidId!);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLElement).focus?.();
          }
        }, 50);
      }
    }
    return !hasError;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(test, questions);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ---- Settings ---- */}
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-semibold">{t.editor.settingsTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="title">{t.editor.titleLabel}</Label>
              <HelpHint text={t.editor.help.title} />
            </div>
            <Input
              id="title"
              value={test.title}
              onChange={(e) => {
                setTest({ ...test, title: e.target.value });
                if (errors.title) clearError(() => setErrors((er) => ({ ...er, title: false })));
              }}
              placeholder={t.editor.titlePh}
              className={errors.title ? errBorder : ""}
              aria-invalid={!!errors.title}
            />
            {errors.title && <FieldError>{t.validate.fieldRequired}</FieldError>}
          </div>

          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="desc">{t.editor.descLabel}</Label>
              <HelpHint text={t.editor.help.desc} />
            </div>
            <Textarea
              id="desc"
              value={test.description}
              onChange={(e) => setTest({ ...test, description: e.target.value })}
              placeholder={t.editor.descPh}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="time">{t.editor.timeLabel}</Label>
              <HelpHint text={t.editor.help.time} />
            </div>
            <Input
              id="time"
              type="number"
              min={1}
              max={240}
              value={test.time_limit_min}
              onChange={(e) => setTest({ ...test, time_limit_min: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="attempts">{t.editor.attemptsLabel}</Label>
              <HelpHint text={t.editor.help.attempts} />
            </div>
            <Input
              id="attempts"
              type="number"
              min={1}
              max={50}
              value={test.max_attempts}
              onChange={(e) => setTest({ ...test, max_attempts: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="cursor-pointer">{t.editor.randomLabel}</Label>
                <HelpHint text={t.editor.help.random} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.editor.randomDesc}</p>
            </div>
            <Switch
              checked={test.random_enabled}
              onCheckedChange={(v) => setTest({ ...test, random_enabled: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="cursor-pointer">{t.editor.publicLabel}</Label>
                <HelpHint text={t.editor.help.public} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.editor.publicDesc}</p>
            </div>
            <Switch
              checked={test.is_public}
              onCheckedChange={(v) => {
                setTest({ ...test, is_public: v });
                if (v) setErrors((er) => ({ ...er, accessCode: false }));
              }}
            />
          </div>

          {!test.is_public && (
            <div className="md:col-span-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Label htmlFor="code">{t.editor.codeLabel}</Label>
                <HelpHint text={t.editor.help.code} />
              </div>
              <Input
                id="code"
                value={test.access_code}
                onChange={(e) => {
                  setTest({ ...test, access_code: e.target.value });
                  if (errors.accessCode) setErrors((er) => ({ ...er, accessCode: false }));
                }}
                placeholder={t.editor.codePh}
                className={errors.accessCode ? errBorder : ""}
                aria-invalid={!!errors.accessCode}
              />
              {errors.accessCode && <FieldError>{t.validate.fieldRequired}</FieldError>}
            </div>
          )}
        </div>
      </section>

      {/* ---- Questions ---- */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t.editor.questionsTitle(questions.length)}</h2>
          <Button variant="outline" size="sm" onClick={addQ}>
            <Plus className="mr-2 h-4 w-4" />
            {t.editor.addQuestion}
          </Button>
        </div>
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const qErr = errors.questions[qi] ?? {};
            return (
              <div key={qi} className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t.editor.questionN(qi + 1)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeQ(qi)}
                    disabled={questions.length === 1}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  id={`q-${qi}`}
                  value={q.question_text}
                  onChange={(e) => updateQ(qi, { question_text: e.target.value })}
                  placeholder={t.editor.questionPh}
                  className={`mb-1 ${qErr.text ? errBorder : ""}`}
                  aria-invalid={!!qErr.text}
                />
                {qErr.text && <FieldError>{t.validate.fieldRequired}</FieldError>}

                <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">{t.editor.optionsHint}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const optErr = qErr.options?.[oi];
                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQ(qi, { correct_answer_index: oi })}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            q.correct_answer_index === oi
                              ? "border-success bg-success text-success-foreground"
                              : "border-input hover:bg-muted"
                          }`}
                          aria-label={`${oi + 1}-variant to'g'ri deb belgilash`}
                        >
                          {q.correct_answer_index === oi ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{String.fromCharCode(65 + oi)}</span>
                          )}
                        </button>
                        <Input
                          id={`q-${qi}-opt-${oi}`}
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={t.editor.optionPh(String.fromCharCode(65 + oi))}
                          className={optErr ? errBorder : ""}
                          aria-invalid={!!optErr}
                        />
                      </div>
                    );
                  })}
                </div>
                {qErr.options?.some(Boolean) && <FieldError>{t.validate.fieldRequired}</FieldError>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={saving} className="shadow-elegant">
          {saving ? t.editor.saving : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" /> {children}
    </p>
  );
}
