import {
  Accessibility, Bell, Brain, ClipboardList, FileHeart, HandHeart, HeartHandshake, HeartPulse, House,
  Leaf, Microscope, Pill, Radar, Smartphone, Smile, Stethoscope, UserRoundCheck, Users, Video,
  type LucideProps,
} from "lucide-react";

const icons = {
  stethoscope: Stethoscope,
  brain: Brain,
  handHeart: HandHeart,
  house: House,
  heartPulse: HeartPulse,
  heartHandshake: HeartHandshake,
  userCheck: UserRoundCheck,
  microscope: Microscope,
  leaf: Leaf,
  accessibility: Accessibility,
  pill: Pill,
  smile: Smile,
  clipboard: ClipboardList,
  video: Video,
  smartphone: Smartphone,
  users: Users,
  radar: Radar,
  bell: Bell,
  fileHeart: FileHeart,
} as const;

export type IconName = keyof typeof icons;

/** Decorative by default; pass `aria-label` + `aria-hidden={false}` when meaningful. */
export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = icons[name];
  return <C aria-hidden strokeWidth={1.6} {...props} />;
}
