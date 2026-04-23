import { toast } from "sonner";
import { t } from "@/lib/i18n";

/**
 * Wraps an async (typically Supabase) call so a thrown error or a non-null
 * `error` field never crashes the UI. Shows a friendly Uzbek toast on failure.
 *
 * Usage:
 *   const data = await safeQuery(
 *     () => supabase.from("tests").select("*").eq("id", id).maybeSingle(),
 *     { fallback: null }
 *   );
 */
export async function safeQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  opts: { fallback: T; errorMessage?: string; silent?: boolean } = { fallback: null as unknown as T },
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      if (!opts.silent) toast.error(opts.errorMessage ?? t.err.loadFailed);
      // eslint-disable-next-line no-console
      console.error("[safeQuery]", error);
      return opts.fallback;
    }
    return (data ?? opts.fallback) as T;
  } catch (e) {
    if (!opts.silent) toast.error(opts.errorMessage ?? t.err.network);
    // eslint-disable-next-line no-console
    console.error("[safeQuery] threw", e);
    return opts.fallback;
  }
}

/** Same as safeQuery but for write/mutation calls — returns success boolean. */
export async function safeMutation(
  fn: () => PromiseLike<{ error: { message: string } | null }>,
  opts: { errorMessage?: string } = {},
): Promise<boolean> {
  try {
    const { error } = await fn();
    if (error) {
      toast.error(opts.errorMessage ?? t.err.saveFailed);
      // eslint-disable-next-line no-console
      console.error("[safeMutation]", error);
      return false;
    }
    return true;
  } catch (e) {
    toast.error(opts.errorMessage ?? t.err.network);
    // eslint-disable-next-line no-console
    console.error("[safeMutation] threw", e);
    return false;
  }
}
