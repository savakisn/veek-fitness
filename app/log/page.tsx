import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogScreen } from "@/components/log-screen";
import { isAiConfigured } from "@/lib/ai/core";

export default function LogPage() {
  return (
    <main className="px-4">
      <div className="pt-6">
        <Link href="/" className="text-muted-foreground inline-flex items-center text-sm">
          <ArrowLeft className="mr-1 size-4" /> Today
        </Link>
      </div>
      <h1 className="pt-4 pb-6 text-2xl font-semibold tracking-tight">Log activity</h1>
      <LogScreen aiEnabled={isAiConfigured()} />
    </main>
  );
}
