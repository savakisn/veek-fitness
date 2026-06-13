import "server-only";

// AI summary seam. Pluggable provider, free Gemini first, swap to Claude later by
// adding ./claude and a case below. Nothing calls this in v1; it's the wiring so
// the weekly/monthly insight feature is a drop-in fast-follow.
export type SummaryInput = {
  weekSessions: number;
  weeklyGoal: number;
  streakWeeks: number;
  byCategory: Record<string, number>;
  recentTypes: string[];
};

export interface AiProvider {
  summarize(input: SummaryInput): Promise<string>;
}

export async function getProvider(): Promise<AiProvider> {
  const name = process.env.AI_PROVIDER ?? "gemini";
  switch (name) {
    case "gemini":
      return (await import("./gemini")).gemini;
    // case "claude": return (await import("./claude")).claude;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${name}`);
  }
}
