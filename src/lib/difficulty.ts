import { t } from "@/lib/i18n";

export type Difficulty = "new" | "easy" | "medium" | "hard";

/**
 * Map a question's cached attempts_count + error_rate to a difficulty bucket.
 * Threshold rule (per spec): need >=5 attempts before classifying.
 *   <0.30 -> Oson, 0.30..0.60 -> O'rta, >0.60 -> Qiyin.
 */
export function getDifficulty(attemptsCount: number, errorRate: number): Difficulty {
  if (!attemptsCount || attemptsCount < 5) return "new";
  if (errorRate < 0.3) return "easy";
  if (errorRate <= 0.6) return "medium";
  return "hard";
}

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "easy":
      return t.difficulty.easy;
    case "medium":
      return t.difficulty.medium;
    case "hard":
      return t.difficulty.hard;
    default:
      return t.difficulty.new;
  }
}

export function difficultyToneClass(d: Difficulty): string {
  switch (d) {
    case "easy":
      return "bg-success/15 text-success";
    case "medium":
      return "bg-accent/20 text-accent-foreground";
    case "hard":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
