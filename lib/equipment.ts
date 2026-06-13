// All gear the app knows about, with display labels. Home starts at just the mat
// and grows as you buy things; Gym has it all. New routines unlock automatically
// when their required equipment is in your owned list.
export const EQUIPMENT: { key: string; label: string }[] = [
  { key: "mat", label: "Yoga mat" },
  { key: "bands", label: "Resistance bands" },
  { key: "dumbbells", label: "Dumbbells" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "bench", label: "Bench" },
  { key: "barbell", label: "Barbell" },
  { key: "squat_rack", label: "Squat rack" },
  { key: "pullup_bar", label: "Pull-up bar" },
  { key: "cable", label: "Cable machine" },
  { key: "machine", label: "Weight machines" },
];

const LABELS = new Map(EQUIPMENT.map((e) => [e.key, e.label]));
export function equipmentLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

// "none" means truly no equipment; it is always available.
export function isOwned(item: string, owned: string[]): boolean {
  return item === "none" || owned.includes(item);
}
