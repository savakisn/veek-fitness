import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cadence</h1>
          <p className="text-muted-foreground mt-1 text-sm">Enter your passcode</p>
        </div>
        <form action={login} className="space-y-3">
          <Input
            name="passcode"
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="Passcode"
            aria-label="Passcode"
          />
          {error && <p className="text-destructive text-sm">Wrong passcode, try again.</p>}
          <Button type="submit" className="w-full">
            Enter
          </Button>
        </form>
      </div>
    </main>
  );
}
