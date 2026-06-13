import { getProfile } from "@/lib/db/queries";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <main>
      <PageHeader title="Settings" />
      <div className="px-4">
        <SettingsForm profile={profile} />
      </div>
    </main>
  );
}
