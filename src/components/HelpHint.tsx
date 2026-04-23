import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Small (?) icon next to a feature label. Clicking it opens a popover with a
 * short Uzbek explanation. Closes on outside click or Escape. Touch friendly.
 */
export function HelpHint({ text, className = "" }: { text: string; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Yordam"
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-72 max-w-[calc(100vw-2rem)] border-foreground/10 bg-popover p-3 text-popover-foreground shadow-elegant"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-xs leading-relaxed">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
