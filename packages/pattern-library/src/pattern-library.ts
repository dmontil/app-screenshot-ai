import type { DesignPattern } from "@app-screenshot-ai/schemas";

export type PatternRetrievalQuery = {
  category: string;
  tone: string[];
  limit?: number;
};

export class PatternLibrary {
  private readonly patterns: DesignPattern[];

  constructor(patterns: readonly DesignPattern[]) {
    this.patterns = [...patterns];
  }

  retrieve(query: PatternRetrievalQuery): DesignPattern[] {
    const normalizedCategory = query.category.toLowerCase();
    const requestedTone = new Set(query.tone.map((tone) => tone.toLowerCase()));
    const limit = query.limit ?? 5;

    return this.patterns
      .filter((pattern) => pattern.category.toLowerCase() === normalizedCategory)
      .map((pattern) => ({ pattern, score: scorePattern(pattern, requestedTone) }))
      .sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id))
      .slice(0, limit)
      .map(({ pattern }) => pattern);
  }
}

function scorePattern(pattern: DesignPattern, requestedTone: Set<string>): number {
  if (requestedTone.size === 0) return 0;

  return pattern.tone.reduce((score, tone) => {
    return requestedTone.has(tone.toLowerCase()) ? score + 1 : score;
  }, 0);
}
