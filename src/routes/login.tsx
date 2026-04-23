import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Quizly" }] }),
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
    const { error } = await signIn(form);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with your phone and password.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
