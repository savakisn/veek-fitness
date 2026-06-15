import { getCurrentUser } from "@/lib/auth";
import { getHousehold } from "@/lib/db/kitchen";
import { logout } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, household] = await Promise.all([getCurrentUser(), getHousehold()]);
  return (
    <main>
      <PageHeader title="Settings" subtitle={`Signed in as ${user.name}`} />
      <div className="px-4">
        <SettingsForm user={user} household={household} />
        <form action={logout} className="mt-8">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" /> Log out
          </Button>
        </form>
      </div>
    </main>
  );
}
