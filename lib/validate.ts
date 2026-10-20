import { z } from "zod";

// Shared input schemas for server actions. Actions are reachable by direct POST, so
// every argument is re-validated here regardless of what the client form allows.

export const id = z.number().int().positive().max(2_147_483_647);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= "2000-01-01" && s <= "2100-01-01";
  });

// Trimmed string with a hard length cap.
export const text = (max: number) => z.string().trim().max(max);
export const name = (max = 120) => z.string().trim().min(1).max(max);
export const location = z.enum(["home", "gym"]);

// Returns the parsed value, or null when it doesn't validate.
export function check<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> | null {
  const r = schema.safeParse(value);
  return r.success ? r.data : null;
}
