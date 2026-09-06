import { useToast } from "@/src/components/ToastProvider";
import { useOnlineStatus } from "@/src/hooks/useOnlineStatus";
import { categoryById } from "@/src/lib/categories";
import { logActionError } from "@/src/lib/logger";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { fetchPlaylistItems, fetchVideoChunks, validateYoutubeResourceUrl } from "@/src/lib/youtube";
import { useRoutineStore } from "@/src/store/routineStore";
import type { Resource, ResourceType } from "@/src/types";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Keyboard } from "react-native";
import { normalizeColor } from "./format";
export type ResourceDraft = {
  id?: string;
  title: string;
  type: ResourceType;
  categoryId: string;
};
export function useManageScreen() {
  const router = useRouter();
  const settings = useRoutineStore((state) => state.settings);
  const categories = useRoutineStore((state) => state.categories);
  const templates = useRoutineStore((state) => state.templates);
  const resources = useRoutineStore((state) => state.resources);
  const createCategory = useRoutineStore((state) => state.createCategory);
  const updateCategory = useRoutineStore((state) => state.updateCategory);
  const deleteCategory = useRoutineStore((state) => state.deleteCategory);
  const createTemplate = useRoutineStore((state) => state.createTemplate);
  const deleteTemplate = useRoutineStore((state) => state.deleteTemplate);
  const createResource = useRoutineStore((state) => state.createResource);
  const updateResource = useRoutineStore((state) => state.updateResource);
  const deleteResource = useRoutineStore((state) => state.deleteResource);
  const setResourceItems = useRoutineStore((state) => state.setResourceItems);
  const clearResourceItems = useRoutineStore((state) => state.clearResourceItems);
  const online = useOnlineStatus();
  const mode = modeFromSetting(settings.themeMode);
  const theme = appTheme(mode);
  const toast = useToast();
  const [section, setSection] = useState<"templates" | "categories" | "resources">("templates");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "");
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<{ id?: string; label: string; color: string } | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [resourceCategoryOpen, setResourceCategoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openResourceIds, setOpenResourceIds] = useState<Record<string, boolean>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [chunkInputs, setChunkInputs] = useState<Record<string, string>>({});
  const [loadingResourceId, setLoadingResourceId] = useState<string | null>(null);
  const [pageByResource, setPageByResource] = useState<Record<string, number>>({});
  const canBackup = online && isSupabaseConfigured;
  useEffect(() => {
    if (!categories.some((category) => category.id === selectedCategoryId)) setSelectedCategoryId(categories[0]?.id ?? "");
  }, [categories, selectedCategoryId]);
  const searchText = query.trim();
  const searchNeedle = searchText.toLowerCase();
  const visibleTemplates = useMemo(
    () => templates.filter((template) => !searchNeedle || template.name.toLowerCase().includes(searchNeedle) || template.description?.toLowerCase().includes(searchNeedle)),
    [searchNeedle, templates],
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => !searchNeedle || category.label.toLowerCase().includes(searchNeedle)),
    [categories, searchNeedle],
  );
  const visibleResources = useMemo(() => {
    return resources.filter((resource) => {
      const category = categoryById(categories, resource.categoryId);
      const matchesQuery =
        !searchNeedle ||
        resource.title.toLowerCase().includes(searchNeedle) ||
        category.label.toLowerCase().includes(searchNeedle) ||
        resource.items.some((item) => item.title.toLowerCase().includes(searchNeedle));
      return matchesQuery;
    });
  }, [categories, resources, searchNeedle]);
  const addTemplate = async () => {
    Keyboard.dismiss();
    if (!categories.length) {
      toast({ kind: "info", title: "No areas", message: "Add areas like DSA, gym, study, or recovery." });
      setSection("categories");
      return;
    }
    const template = createTemplate();
    router.push(`/template-editor?templateId=${template.id}&isNew=1`);
  };
  const removeTemplate = async (templateId: string) => {
    if (Object.values(useRoutineStore.getState().plans).some((plan) => plan.templateId === templateId)) {
      toast({ kind: "warning", title: "Routine is in use", message: "This routine is used by an active plan. Edit it if needed; delete it after the plan no longer uses it." });
      return;
    }
    deleteTemplate(templateId);
    toast({ kind: "success", title: "Routine deleted", message: "The routine was removed from your library." });
  };
  const startCategoryCreate = () => {
    Keyboard.dismiss();
    setCategoryDraft({ label: "", color: "#38BDF8" });
  };
  const saveCategory = async () => {
    if (!categoryDraft) return;
    const label = categoryDraft.label.trim().toLowerCase();
    const duplicate = categories.some((category) => category.id !== categoryDraft.id && category.label.trim().toLowerCase() === label.toLowerCase());
    if (!label) {
      toast({ kind: "warning", title: "Missing name", message: "Enter a name first." });
      return;
    }
    if (duplicate) {
      toast({ kind: "warning", title: "Area already exists", message: "Use a different area name." });
      return;
    }
    const color = normalizeColor(categoryDraft.color);
    const category = categoryDraft.id ? categories.find((item) => item.id === categoryDraft.id) : createCategory();
    if (!category) return;
    updateCategory(category.id, { label, color });
    toast({ kind: "success", title: "Area saved", message: "The area is ready to use." });
    setSelectedCategoryId(category.id);
    setCategoryDraft(null);
  };
  const removeCategory = async (categoryId: string) => {
    const state = useRoutineStore.getState();
    const templateCount = state.templates.filter((template) => template.blocks.some((block) => block.categoryId === categoryId)).length;
    const resourceCount = state.resources.filter((resource) => resource.categoryId === categoryId).length;
    const planCount = Object.values(state.plans).filter((plan) => plan.blocks.some((block) => block.categoryId === categoryId)).length;
    if (templateCount || resourceCount || planCount) {
      const places = [templateCount ? `${templateCount} routine${templateCount === 1 ? "" : "s"}` : "", resourceCount ? `${resourceCount} video list${resourceCount === 1 ? "" : "s"}` : "", planCount ? `${planCount} plan${planCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
      toast({ kind: "warning", title: "Area is in use", message: `Used by ${places}. Remove those links first, then delete the area.` });
      return;
    }
    deleteCategory(categoryId);
    toast({ kind: "success", title: "Area deleted", message: "The area was removed from your library." });
    if (categoryDraft?.id === categoryId) setCategoryDraft(null);
  };
  const startResourceCreate = () => {
    Keyboard.dismiss();
    const categoryId = selectedCategoryId || categories[0]?.id;
    if (!categoryId) {
      toast({ kind: "info", title: "No areas", message: "Add areas like DSA, gym, study, or recovery." });
      setSection("categories");
      return;
    }
    setResourceDraft({ title: "", categoryId, type: "youtube-playlist" });
    setResourceCategoryOpen(false);
  };
  const startResourceEdit = (resource: Resource) => {
    Keyboard.dismiss();
    setResourceDraft({ id: resource.id, title: resource.title, categoryId: resource.categoryId, type: resource.type });
    setResourceCategoryOpen(false);
  };
  const resourcePlanCount = (resourceId: string) => {
    const itemIds = new Set(resources.find((resource) => resource.id === resourceId)?.items.map((item) => item.id) ?? []);
    return Object.values(useRoutineStore.getState().plans).filter((plan) => plan.blocks.some((block) => block.resourceItemIds.some((id) => itemIds.has(id)))).length;
  };
  const saveResourceDraft = async () => {
    if (!resourceDraft) return;
    Keyboard.dismiss();
    const title = resourceDraft.title.trim();
    if (!title) {
      toast({ kind: "warning", title: "Missing name", message: "Enter a name first." });
      return;
    }
    if (resources.some((resource) => resource.id !== resourceDraft.id && resource.categoryId === resourceDraft.categoryId && resource.type === resourceDraft.type)) {
      toast({ kind: "warning", title: "Video list already exists", message: "Choose a different area or video type." });
      return;
    }
    const existing = resources.find((resource) => resource.id === resourceDraft.id);
    if (existing) {
      const hasPlanLinks = resourcePlanCount(existing.id) > 0;
      const identityChanged = existing.type !== resourceDraft.type || existing.categoryId !== resourceDraft.categoryId;
      if (hasPlanLinks && identityChanged) {
        toast({ kind: "warning", title: "Video list is in use", message: "This video list is used by an active plan. Keep its area and type, or remove the video items from that plan first." });
        return;
      }
      updateResource(existing.id, {
        title,
        categoryId: resourceDraft.categoryId,
        type: resourceDraft.type,
        chunkMinutes: resourceDraft.type === "youtube-video" ? existing.chunkMinutes ?? 30 : undefined,
        ...(existing.type !== resourceDraft.type ? { url: undefined, items: [] } : {}),
      });
      setResourceDraft(null);
      toast({ kind: "success", title: "Video list saved", message: "The video list details are updated." });
      return;
    }
    const resource = createResource(title, resourceDraft.categoryId, resourceDraft.type);
    setSelectedCategoryId(resource.categoryId);
    setResourceDraft(null);
    setOpenResourceIds((current) => ({ ...current, [resource.id]: true }));
    toast({ kind: "success", title: "Video list created", message: "Add a YouTube link to load videos." });
  };
  const saveResourceLink = async (resource: Resource) => {
    Keyboard.dismiss();
    const url = (urlInputs[resource.id] ?? resource.url ?? "").trim();
    const validation = validateYoutubeResourceUrl(url, resource.type);
    if (validation) {
      toast({ kind: "warning", title: "Invalid link", message: "That YouTube link doesn't look right." });
      return;
    }
    const chunkMinutes = Math.max(1, Number(chunkInputs[resource.id] ?? resource.chunkMinutes ?? 30));
    updateResource(resource.id, { url: url || undefined, chunkMinutes: resource.type === "youtube-video" ? chunkMinutes : undefined });
    setOpenResourceIds((current) => ({ ...current, [resource.id]: false }));
    toast({ kind: "success", title: "Video link saved", message: "The link is ready to load." });
  };
  const fetchResource = async (resource: Resource) => {
    if (!online) {
      toast({ kind: "warning", title: "No internet", message: "Connect to the internet to load videos." });
      return;
    }
    const url = (urlInputs[resource.id] ?? resource.url ?? "").trim();
    const validation = validateYoutubeResourceUrl(url, resource.type);
    if (validation) {
      toast({ kind: "warning", title: "Invalid link", message: "That YouTube link doesn't look right." });
      return;
    }
    setLoadingResourceId(resource.id);
    const work = (async () => {
      const chunkMinutes = Math.max(1, Number(chunkInputs[resource.id] ?? resource.chunkMinutes ?? 30));
      const items =
        resource.type === "youtube-video" ? await fetchVideoChunks(resource.id, url, chunkMinutes) : await fetchPlaylistItems(resource.id, url);
      updateResource(resource.id, { chunkMinutes: resource.type === "youtube-video" ? chunkMinutes : resource.chunkMinutes });
      setResourceItems(resource.id, url, items);
      setPageByResource((current) => ({ ...current, [resource.id]: 0 }));
      return items.length;
    })();

    toast.promise(work, {
      loading: "Loading videos...",
      success: "Video loaded",
      error: "Video loading failed",
    });

    try {
      await work;
    } catch (error) {
      logActionError("fetch resource", error, { resourceId: resource.id, type: resource.type, url });
    } finally {
      setLoadingResourceId(null);
    }
  };
  const removeResource = async (resourceId: string) => {
    const planCount = resourcePlanCount(resourceId);
    if (planCount) {
      toast({ kind: "warning", title: "Video list is in use", message: `Used by ${planCount} plan${planCount === 1 ? "" : "s"}. Remove its videos from those plans before deleting it.` });
      return;
    }
    deleteResource(resourceId);
    toast({ kind: "success", title: "Video list deleted", message: "The video list was removed from your library." });
  };
  const removeItems = async (resourceId: string) => {
    Keyboard.dismiss();
    const itemIds = new Set(resources.find((resource) => resource.id === resourceId)?.items.map((item) => item.id) ?? []);
    const planCount = Object.values(useRoutineStore.getState().plans).filter((plan) => plan.blocks.some((block) => block.resourceItemIds.some((id) => itemIds.has(id)))).length;
    if (planCount) {
      toast({ kind: "warning", title: "Videos are in use", message: `Used by ${planCount} plan${planCount === 1 ? "" : "s"}. Remove them from those plans before clearing this list.` });
      return;
    }
    clearResourceItems(resourceId);
    setUrlInputs((current) => ({ ...current, [resourceId]: "" }));
    setPageByResource((current) => ({ ...current, [resourceId]: 0 }));
    toast({ kind: "success", title: "Videos removed", message: "The loaded videos were cleared from this list." });
  };
  const copyResourceLink = async (resource: Resource) => {
    const url = (urlInputs[resource.id] ?? resource.url ?? "").trim();
    if (!url) {
      toast({ kind: "info", title: "No videos", message: "No videos have been added yet." });
      return;
    }
    await Clipboard.setStringAsync(url);
    toast({ kind: "success", title: "Link copied", message: "The video link is ready to paste." });
  };
  return { router, categories, templates, resources, theme, section, setSection, resourceDraft, setResourceDraft, categoryDraft, setCategoryDraft, colorPickerOpen, setColorPickerOpen, resourceCategoryOpen, setResourceCategoryOpen, query, setQuery, openResourceIds, setOpenResourceIds, urlInputs, setUrlInputs, chunkInputs, setChunkInputs, loadingResourceId, pageByResource, setPageByResource, canBackup, searchText, visibleTemplates, visibleCategories, visibleResources, addTemplate, removeTemplate, startCategoryCreate, saveCategory, removeCategory, startResourceCreate, startResourceEdit, saveResourceDraft, saveResourceLink, fetchResource, removeResource, removeItems, copyResourceLink };
}
