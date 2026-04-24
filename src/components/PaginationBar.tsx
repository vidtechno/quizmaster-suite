import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

/** Compact pagination bar — appears only when total > pageSize. */
export function PaginationBar({ page, pageSize, total, onChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  // Build a small set of page numbers around current page
  const set = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {start}–{end} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const showGap = prev !== undefined && p - prev > 1;
          return (
            <span key={p} className="flex items-center">
              {showGap && <span className="px-1 text-muted-foreground">…</span>}
              <Button
                size="sm"
                variant={p === page ? "default" : "outline"}
                className="h-8 min-w-8 rounded-full px-3"
                onClick={() => onChange(p)}
              >
                {p}
              </Button>
            </span>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label="next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
