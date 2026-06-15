import type { DB } from "./index";
import { exercises, routines, routineExercises, users, household } from "./schema";

type ExDef = {
  slug: string;
  name: string;
  category: "mobility" | "core" | "strength" | "cardio" | "stretch";
  primaryMuscles: string[];
  equipment: string[];
  backSafe: boolean;
  cues: string;
};

const EXERCISES: ExDef[] = [
  // Mobility / spine
  { slug: "cat-cow", name: "Cat-Cow", category: "mobility", primaryMuscles: ["spine"], equipment: ["mat"], backSafe: true, cues: "Slow. Move one vertebra at a time, breathe with it." },
  { slug: "thoracic-rotation", name: "Quadruped Thoracic Rotation", category: "mobility", primaryMuscles: ["upper back"], equipment: ["mat"], backSafe: true, cues: "Hand behind head, rotate from the mid-back, not the low back." },
  { slug: "prone-press-up", name: "Prone Press-Up", category: "mobility", primaryMuscles: ["spine"], equipment: ["mat"], backSafe: true, cues: "Gentle. Hips stay down, only go as far as is comfortable." },
  { slug: "wall-angel", name: "Wall Angel", category: "mobility", primaryMuscles: ["shoulders"], equipment: ["none"], backSafe: true, cues: "Low back flat to the wall, arms slide up without arching." },
  { slug: "90-90-hip-switch", name: "90/90 Hip Switch", category: "mobility", primaryMuscles: ["hips"], equipment: ["mat"], backSafe: true, cues: "Tall spine, rotate both knees side to side under control." },
  { slug: "worlds-greatest-stretch", name: "World's Greatest Stretch", category: "mobility", primaryMuscles: ["hips", "spine"], equipment: ["mat"], backSafe: true, cues: "Lunge, hand down, rotate top arm to the ceiling." },
  { slug: "standing-rotation", name: "Standing Trunk Rotation", category: "mobility", primaryMuscles: ["spine"], equipment: ["none"], backSafe: true, cues: "Soft knees, rotate through the ribcage. Builds the disc golf turn." },
  { slug: "single-leg-balance", name: "Single-Leg Balance", category: "mobility", primaryMuscles: ["ankles", "hips"], equipment: ["none"], backSafe: true, cues: "Stand tall on one foot, soft knee. Progress by closing your eyes." },

  // Stretch
  { slug: "child-pose", name: "Child's Pose", category: "stretch", primaryMuscles: ["back", "hips"], equipment: ["mat"], backSafe: true, cues: "Sit hips to heels, reach long, let the back round gently." },
  { slug: "hip-flexor-stretch", name: "Half-Kneeling Hip Flexor Stretch", category: "stretch", primaryMuscles: ["hip flexors"], equipment: ["mat"], backSafe: true, cues: "Tuck the pelvis, squeeze the back glute, don't arch the low back." },
  { slug: "couch-stretch", name: "Couch Stretch", category: "stretch", primaryMuscles: ["quads", "hip flexors"], equipment: ["mat"], backSafe: true, cues: "Back foot up a wall, stay tall. Ease in, it's intense." },
  { slug: "hamstring-stretch", name: "Standing Hamstring Stretch", category: "stretch", primaryMuscles: ["hamstrings"], equipment: ["none"], backSafe: true, cues: "Hinge from the hips with a flat back, not a rounded one." },

  // Core (back-safe)
  { slug: "dead-bug", name: "Dead Bug", category: "core", primaryMuscles: ["core"], equipment: ["mat"], backSafe: true, cues: "Low back pinned to the floor the whole time. Opposite arm and leg." },
  { slug: "bird-dog", name: "Bird Dog", category: "core", primaryMuscles: ["core", "back"], equipment: ["mat"], backSafe: true, cues: "Reach opposite arm and leg, keep hips level, no rotation." },
  { slug: "glute-bridge", name: "Glute Bridge", category: "core", primaryMuscles: ["glutes"], equipment: ["mat"], backSafe: true, cues: "Drive through heels, squeeze glutes, ribs down. Don't hyperextend." },
  { slug: "glute-bridge-march", name: "Glute Bridge March", category: "core", primaryMuscles: ["glutes", "core"], equipment: ["mat"], backSafe: true, cues: "Hold the bridge, lift one foot at a time without dropping the hips." },
  { slug: "plank", name: "Front Plank", category: "core", primaryMuscles: ["core"], equipment: ["mat"], backSafe: true, cues: "Straight line head to heels, squeeze glutes, breathe." },
  { slug: "side-plank", name: "Side Plank", category: "core", primaryMuscles: ["obliques"], equipment: ["mat"], backSafe: true, cues: "Stack the hips, push the floor away. Drop to a knee if needed." },
  { slug: "superman", name: "Superman (Gentle)", category: "core", primaryMuscles: ["back"], equipment: ["mat"], backSafe: true, cues: "Small lift of arms and legs, no cranking. Long neck." },

  // Strength (bodyweight)
  { slug: "bodyweight-squat", name: "Bodyweight Squat", category: "strength", primaryMuscles: ["legs"], equipment: ["none"], backSafe: true, cues: "Sit back and down, knees track over toes, chest up." },
  { slug: "reverse-lunge", name: "Reverse Lunge", category: "strength", primaryMuscles: ["legs"], equipment: ["none"], backSafe: true, cues: "Step back, drop straight down, push through the front heel." },
  { slug: "lateral-lunge", name: "Lateral Lunge", category: "strength", primaryMuscles: ["legs", "adductors"], equipment: ["none"], backSafe: true, cues: "Step wide, sit into one hip, keep the other leg straight." },
  { slug: "wall-sit", name: "Wall Sit", category: "strength", primaryMuscles: ["legs"], equipment: ["none"], backSafe: true, cues: "Thighs parallel, back flat on the wall, hold and breathe." },
  { slug: "calf-raise", name: "Calf Raise", category: "strength", primaryMuscles: ["calves"], equipment: ["none"], backSafe: true, cues: "Up slow, pause at the top, lower under control." },
  { slug: "pushup", name: "Push-Up", category: "strength", primaryMuscles: ["chest", "triceps"], equipment: ["mat"], backSafe: true, cues: "Tight plank, elbows ~45 degrees, full range. Knees down to scale." },
  { slug: "incline-pushup", name: "Incline Push-Up", category: "strength", primaryMuscles: ["chest"], equipment: ["none"], backSafe: true, cues: "Hands on a counter or step. Easier on the shoulders and a good start." },
  { slug: "pike-pushup", name: "Pike Push-Up", category: "strength", primaryMuscles: ["shoulders"], equipment: ["mat"], backSafe: true, cues: "Hips high, lower the crown of your head toward the floor." },
  { slug: "side-leg-raise", name: "Side-Lying Leg Raise", category: "strength", primaryMuscles: ["glutes"], equipment: ["mat"], backSafe: true, cues: "Lead with the heel, small controlled lift, no rocking." },

  // Cardio / conditioning
  { slug: "march-in-place", name: "March in Place", category: "cardio", primaryMuscles: ["full body"], equipment: ["none"], backSafe: true, cues: "Drive the knees, pump the arms. Easy warm-up pace." },
  { slug: "jumping-jack", name: "Jumping Jack", category: "cardio", primaryMuscles: ["full body"], equipment: ["none"], backSafe: true, cues: "Soft landings. Step-jacks if the impact bothers you." },
  { slug: "mountain-climber", name: "Mountain Climber", category: "cardio", primaryMuscles: ["core"], equipment: ["mat"], backSafe: true, cues: "Solid plank, drive knees in, hips stay low." },

  // Yoga / Pilates (mat) — Kate's home track
  { slug: "downward-dog", name: "Downward Dog", category: "mobility", primaryMuscles: ["full body"], equipment: ["mat"], backSafe: true, cues: "Hips up and back, long spine, press the floor away, soften the knees." },
  { slug: "cobra-pose", name: "Cobra", category: "mobility", primaryMuscles: ["spine"], equipment: ["mat"], backSafe: true, cues: "Gentle lift of the chest, elbows soft, no cranking the low back." },
  { slug: "seated-twist", name: "Seated Spinal Twist", category: "mobility", primaryMuscles: ["spine"], equipment: ["mat"], backSafe: true, cues: "Tall spine, rotate from the mid-back, breathe into it." },
  { slug: "forward-fold", name: "Standing Forward Fold", category: "stretch", primaryMuscles: ["hamstrings", "back"], equipment: ["mat"], backSafe: true, cues: "Soft knees, hinge from the hips, let the head hang heavy." },
  { slug: "chair-pose", name: "Chair Pose", category: "strength", primaryMuscles: ["legs"], equipment: ["mat"], backSafe: true, cues: "Sit back like into a chair, weight in the heels, ribs down." },
  { slug: "warrior-2", name: "Warrior II", category: "strength", primaryMuscles: ["legs", "hips"], equipment: ["mat"], backSafe: true, cues: "Front knee over ankle, arms long, gaze over the front hand." },
  { slug: "pilates-hundred", name: "Pilates Hundred", category: "core", primaryMuscles: ["core"], equipment: ["mat"], backSafe: true, cues: "Low back pressed down, small fast arm pulses, steady breath." },
  { slug: "pilates-roll-up", name: "Pilates Roll-Up", category: "core", primaryMuscles: ["core"], equipment: ["mat"], backSafe: true, cues: "Peel up one vertebra at a time, control all the way down." },
  { slug: "leg-circles", name: "Single-Leg Circles", category: "core", primaryMuscles: ["core", "hips"], equipment: ["mat"], backSafe: true, cues: "Pelvis still, draw slow circles with one straight leg." },

  // Equipment (Gym track)
  { slug: "goblet-squat", name: "Goblet Squat", category: "strength", primaryMuscles: ["legs"], equipment: ["dumbbells"], backSafe: true, cues: "Hold one bell at the chest, sit between the hips, tall chest." },
  { slug: "dumbbell-rdl", name: "Dumbbell Romanian Deadlift", category: "strength", primaryMuscles: ["hamstrings", "glutes"], equipment: ["dumbbells"], backSafe: true, cues: "Hinge at the hips, flat back, feel the hamstrings, no rounding." },
  { slug: "dumbbell-row", name: "One-Arm Dumbbell Row", category: "strength", primaryMuscles: ["back"], equipment: ["dumbbells", "bench"], backSafe: true, cues: "Flat back, row to the hip, no twisting through the spine." },
  { slug: "dumbbell-press", name: "Dumbbell Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: ["dumbbells", "bench"], backSafe: true, cues: "Shoulder blades set, control the weight down, press up." },
  { slug: "lat-pulldown", name: "Lat Pulldown", category: "strength", primaryMuscles: ["back"], equipment: ["cable"], backSafe: true, cues: "Pull to the collarbone, lead with the elbows, no leaning back." },
  { slug: "band-pull-apart", name: "Band Pull-Apart", category: "strength", primaryMuscles: ["upper back"], equipment: ["bands"], backSafe: true, cues: "Arms straight, pull the band to the chest, squeeze the shoulder blades." },
];

type Rx = { slug: string; sets?: number; reps?: number; durationSeconds?: number; restSeconds?: number };
type RoutineDef = {
  slug: string;
  name: string;
  description: string;
  goalTag: "mobility" | "core" | "full_body" | "recovery" | "sport_prep" | "strength" | "yoga" | "pilates";
  estMinutes: number;
  difficulty: "easy" | "moderate";
  items: Rx[];
};

const hold = (slug: string, durationSeconds = 40): Rx => ({ slug, durationSeconds, sets: 1 });
const work = (slug: string, reps = 10, sets = 3): Rx => ({ slug, sets, reps, restSeconds: 45 });

const ROUTINES: RoutineDef[] = [
  {
    slug: "morning-mobility", name: "Morning Mobility", goalTag: "mobility", estMinutes: 10, difficulty: "easy",
    description: "A short, gentle joint warm-up to loosen the spine and hips. Good any day, no equipment.",
    items: [hold("cat-cow", 45), hold("thoracic-rotation", 40), hold("90-90-hip-switch", 45), hold("worlds-greatest-stretch", 40), hold("hamstring-stretch", 40), hold("child-pose", 45)],
  },
  {
    slug: "back-safe-core", name: "Back-Safe Core", goalTag: "core", estMinutes: 15, difficulty: "easy",
    description: "Core work that protects the spine instead of grinding it. Built around the moves that keep a back healthy.",
    items: [work("dead-bug", 8), work("bird-dog", 8), work("glute-bridge", 12), hold("plank", 30), hold("side-plank", 25), work("superman", 10)],
  },
  {
    slug: "hip-spine-mobility", name: "Hip & Spine Mobility", goalTag: "recovery", estMinutes: 15, difficulty: "easy",
    description: "A recovery-day flow for stiff hips and a tight low back. Use it on rest days or after sitting all day.",
    items: [hold("cat-cow", 45), hold("prone-press-up", 30), hold("hip-flexor-stretch", 40), hold("couch-stretch", 40), hold("90-90-hip-switch", 45), hold("child-pose", 45)],
  },
  {
    slug: "lower-body-bodyweight", name: "Lower Body (Bodyweight)", goalTag: "strength", estMinutes: 20, difficulty: "moderate",
    description: "Legs and glutes with nothing but a mat. Keeps you strong for skiing, stairs, and getting off the floor at 70.",
    items: [work("bodyweight-squat", 12), work("reverse-lunge", 10), work("lateral-lunge", 8), work("glute-bridge", 12), hold("wall-sit", 40), work("calf-raise", 15)],
  },
  {
    slug: "upper-body-bodyweight", name: "Upper Body (Bodyweight)", goalTag: "strength", estMinutes: 20, difficulty: "moderate",
    description: "Push and shoulder strength at home. Scales from incline push-ups up to full reps.",
    items: [work("pushup", 8), work("incline-pushup", 10), work("pike-pushup", 6), hold("side-plank", 25), work("wall-angel", 10), work("superman", 10)],
  },
  {
    slug: "full-body-flow", name: "Full Body Flow", goalTag: "full_body", estMinutes: 25, difficulty: "moderate",
    description: "One round through the whole body when you want to do everything in one shot.",
    items: [work("bodyweight-squat", 12), work("pushup", 8), work("reverse-lunge", 10), hold("plank", 30), work("glute-bridge-march", 10), hold("mountain-climber", 30), hold("march-in-place", 45)],
  },
  {
    slug: "look-good-upper", name: "Look-Good Upper", goalTag: "strength", estMinutes: 20, difficulty: "moderate",
    description: "Chest, shoulders, and arms focus. Mobility is the goal, but there's nothing wrong with looking the part.",
    items: [work("pushup", 10), work("pike-pushup", 6), work("incline-pushup", 12), hold("plank", 40), hold("side-plank", 30)],
  },
  {
    slug: "disc-golf-prep", name: "Disc Golf Prep", goalTag: "sport_prep", estMinutes: 15, difficulty: "easy",
    description: "Rotation, shoulders, and single-leg balance so your drive has something to pull from and your back doesn't pay for it.",
    items: [hold("worlds-greatest-stretch", 40), hold("thoracic-rotation", 40), hold("standing-rotation", 40), hold("single-leg-balance", 30), work("lateral-lunge", 8), work("wall-angel", 10)],
  },
  {
    slug: "ski-prep", name: "Ski Prep", goalTag: "sport_prep", estMinutes: 20, difficulty: "moderate",
    description: "Legs, balance, and endurance for the slopes. Build this in the fall so the first day out doesn't wreck you.",
    items: [hold("wall-sit", 45), work("bodyweight-squat", 15), work("lateral-lunge", 8), hold("single-leg-balance", 30), work("reverse-lunge", 10), work("calf-raise", 15)],
  },
  {
    slug: "gentle-yoga-flow", name: "Gentle Yoga Flow", goalTag: "yoga", estMinutes: 20, difficulty: "easy",
    description: "A slow, mat-based flow to loosen the whole body and calm down. Back-safe and beginner-friendly.",
    items: [hold("cat-cow", 45), hold("downward-dog", 40), hold("cobra-pose", 30), hold("seated-twist", 40), hold("forward-fold", 40), hold("child-pose", 45)],
  },
  {
    slug: "pilates-core", name: "Pilates Core", goalTag: "pilates", estMinutes: 20, difficulty: "moderate",
    description: "Mat pilates for deep core control and a strong, protected back. No equipment.",
    items: [hold("pilates-hundred", 40), work("dead-bug", 8), work("pilates-roll-up", 8), work("leg-circles", 10), work("glute-bridge", 12), hold("plank", 30)],
  },
  {
    slug: "sun-salutation-flow", name: "Sun Salutation Flow", goalTag: "yoga", estMinutes: 15, difficulty: "easy",
    description: "A flowing sequence to wake the body up. Move with the breath, repeat as many rounds as feel good.",
    items: [hold("forward-fold", 30), hold("downward-dog", 40), hold("cobra-pose", 30), hold("chair-pose", 30), hold("warrior-2", 30), hold("child-pose", 45)],
  },
  {
    slug: "standing-balance-flow", name: "Standing Balance Flow", goalTag: "yoga", estMinutes: 15, difficulty: "easy",
    description: "Standing yoga shapes for strength and balance on a mat. Builds steadiness without any gear.",
    items: [hold("warrior-2", 30), hold("chair-pose", 30), hold("single-leg-balance", 30), hold("forward-fold", 30), hold("cat-cow", 40)],
  },
  {
    slug: "gym-full-body", name: "Gym Full Body", goalTag: "strength", estMinutes: 35, difficulty: "moderate",
    description: "A simple full-body session for the days you make the 10-minute drive. Needs dumbbells, a bench, and a cable stack.",
    items: [work("goblet-squat", 10), work("dumbbell-rdl", 10), work("dumbbell-press", 10), work("dumbbell-row", 10), work("lat-pulldown", 12), hold("plank", 40)],
  },
];

export async function seedDatabase(db: DB) {
  const existing = await db.select({ id: exercises.id }).from(exercises).limit(1);
  if (existing.length > 0) return;

  const inserted = await db
    .insert(exercises)
    .values(EXERCISES)
    .returning({ id: exercises.id, slug: exercises.slug });
  const idBySlug = new Map(inserted.map((e) => [e.slug, e.id]));

  for (const r of ROUTINES) {
    const [row] = await db
      .insert(routines)
      .values({
        slug: r.slug,
        name: r.name,
        description: r.description,
        goalTag: r.goalTag,
        estMinutes: r.estMinutes,
        difficulty: r.difficulty,
      })
      .returning({ id: routines.id });

    await db.insert(routineExercises).values(
      r.items.map((it, i) => ({
        routineId: row.id,
        exerciseId: idBySlug.get(it.slug)!,
        position: i,
        sets: it.sets ?? null,
        reps: it.reps ?? null,
        durationSeconds: it.durationSeconds ?? null,
        restSeconds: it.restSeconds ?? null,
      })),
    );
  }

  // Two accounts (placeholder passcodes for local dev; prod sets the real ones)
  // and the shared household. Kate's home track is mat-only (yoga/pilates).
  await db
    .insert(users)
    .values([
      { name: "Nick", passcode: "1111" },
      { name: "Kate", passcode: "2222", homeEquipment: ["mat"] },
    ])
    .onConflictDoNothing();
  await db.insert(household).values({ id: 1 }).onConflictDoNothing();
}
