import "server-only";
import type { AiProvider, SummaryInput } from "./index";

// Free Gemini Flash via the REST API, no SDK dependency. Set GEMINI_API_KEY to enable.
// Inert in v1 (nothing calls getProvider yet).
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildPrompt(input: SummaryInput): string {
  return [
    "You are a concise, encouraging fitness coach. The user's goal is staying mobile and",
    "protecting their back into old age, not bodybuilding. Write 2-3 short sentences.",
    "No fluff, no emojis. Mention one thing they did well and one nudge for the week ahead.",
    "",
    `Sessions this week: ${input.weekSessions} (goal ${input.weeklyGoal}).`,
    `Current streak: ${input.streakWeeks} weeks.`,
    `By category: ${JSON.stringify(input.byCategory)}.`,
    `Recent activities: ${input.recentTypes.join(", ") || "none"}.`,
  ].join("\n");
}

export const gemini: AiProvider = {
  async summarize(input: SummaryInput): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set.");
    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(input) }] }] }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  },
};
