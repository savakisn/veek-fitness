import { notFound } from "next/navigation";
import { getRoutineDetail } from "@/lib/db/queries";
import { getLocation } from "@/lib/location";
import { RoutineRunner } from "@/components/routine-runner";

export default async function RoutinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getRoutineDetail(slug);
  if (!detail) notFound();
  const location = await getLocation();

  return <RoutineRunner detail={detail} location={location} />;
}
