import "server-only";
import { cookies } from "next/headers";
import type { Location } from "./db/queries";

export async function getLocation(): Promise<Location> {
  const c = (await cookies()).get("vf_location")?.value;
  return c === "gym" ? "gym" : "home";
}
