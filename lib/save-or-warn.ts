import { toast } from "sonner";

// For optimistic updates: if the save throws (offline, server error, a stale page
// after a deploy), warn instead of crashing into the error boundary. The
// transition then ends and useOptimistic rolls the change back by itself.
export async function saveOrWarn(save: Promise<unknown>): Promise<boolean> {
  try {
    await save;
    return true;
  } catch {
    toast.error("Couldn't save that. Check your connection and try again.");
    return false;
  }
}
