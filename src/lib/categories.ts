import type { Category } from "@/src/types";

export const CATEGORY_IDS = {
  dsa: "00000000-0000-4000-8000-000000000101",
  physics: "00000000-0000-4000-8000-000000000102",
  javascript: "00000000-0000-4000-8000-000000000103",
  systemDesign: "00000000-0000-4000-8000-000000000104",
  networking: "00000000-0000-4000-8000-000000000105",
  sql: "00000000-0000-4000-8000-000000000106",
  gym: "00000000-0000-4000-8000-000000000107",
  karate: "00000000-0000-4000-8000-000000000108",
  punching: "00000000-0000-4000-8000-000000000109",
  recovery: "00000000-0000-4000-8000-000000000110",
  sideQuest: "00000000-0000-4000-8000-000000000111",
  other: "00000000-0000-4000-8000-000000000112",
};

export const defaultCategories: Category[] = [];

const fallbackCategory: Category = {
  id: CATEGORY_IDS.other,
  label: "Uncategorized",
  color: "#94A3B8",
  createdAt: "",
  updatedAt: "",
};

export function categoryById(categories: Category[], id?: string) {
  return categories.find((category) => category.id === id) ?? { ...fallbackCategory, id: id ?? fallbackCategory.id };
}

export function categoryIdFromLabel(label: string, categories: Category[] = defaultCategories) {
  const lower = label.trim().toLowerCase();
  return categories.find((category) => category.label.toLowerCase() === lower)?.id ?? CATEGORY_IDS.other;
}

export function categoryAccent(categories: Category[], idOrLabel: string, fallback = "#38BDF8") {
  return categories.find((category) => category.id === idOrLabel || category.label === idOrLabel)?.color ?? fallback;
}
