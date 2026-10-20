import { getCurrentUser } from "@/lib/auth";
import { getHousehold } from "@/lib/db/kitchen";
import { getCallOutcomes } from "@/lib/db/day-calls";
import { logout } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [household, outcomes] = await Promise.all([getHousehold(), getCallOutcomes(user.id)]);
  return (
    <main>
      <PageHeader title="Settings" subtitle={`Signed in as ${user.name}`} />
      <div className="px-4">
        <SettingsForm user={user} household={household} />
        {outcomes.days > 0 && (
          <section className="bg-card mt-8 rounded-2xl border p-4">
            <h2 className="text-sm font-medium">Daily call, last 28 days</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Followed {outcomes.followed} · did something else {outcomes.other} · skipped {outcomes.skipped} (of{" "}
              {outcomes.days} days)
            </p>
          </section>
        )}
        <form action={logout} className="mt-8">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" /> Log out
          </Button>
        </form>
      </div>
    </main>
  );
}
