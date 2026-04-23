import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: t.login.metaTitle }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(form);
      if (error) {
        toast.error(t.login.invalidCreds);
        return;
      }
      toast.success(t.login.welcome);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">{t.login.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.login.subtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div>
          <Label htmlFor="phone">{t.login.phone}</Label>
          <Input id="phone" required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="password">{t.login.password}</Label>
          <Input id="password" required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t.login.submitting : t.login.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t.login.noAccount}{" "}
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t.login.createAccount}
          </Link>
        </p>
      </form>
    </div>
  );
}
