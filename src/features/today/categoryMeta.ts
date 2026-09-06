import { Atom, BookOpen, Dumbbell, HeartPulse, Sparkles } from "lucide-react-native";

const studyCategories = ["DSA", "JavaScript", "System Design", "Networking", "SQL"];
const fightCategories = ["Gym", "Karate", "Punching"];
export function categoryMeta(label: string, dark: boolean, color: string) {
  if (studyCategories.includes(label)) return { icon: BookOpen, accent: color, bg: dark ? "#0C2737" : "#E0F2FE", text: dark ? "#7DD3FC" : "#075985" };
  if (label === "Physics") return { icon: Atom, accent: color, bg: dark ? "#2E2411" : "#FEF3C7", text: dark ? "#FBBF24" : "#92400E" };
  if (fightCategories.includes(label)) return { icon: Dumbbell, accent: color, bg: dark ? "#30151C" : "#FFE4E6", text: dark ? "#FDA4AF" : "#9F1239" };
  if (label === "Recovery") return { icon: HeartPulse, accent: color, bg: dark ? "#102A20" : "#D1FAE5", text: dark ? "#6EE7B7" : "#065F46" };
  return { icon: Sparkles, accent: color, bg: dark ? "#1C2140" : "#E0E7FF", text: dark ? "#A5B4FC" : "#3730A3" };
}
