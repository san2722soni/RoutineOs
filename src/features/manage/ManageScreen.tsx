import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import ColorPicker, { HueSlider, Panel1, Preview } from "reanimated-color-picker";
import { ChevronDown, Copy, Eraser, Info, Layers, Link, ListVideo, Palette, Pencil, Plus, RefreshCw, Save, Search, Tags, Trash2, Video, X } from "lucide-react-native";
import { useOnlineStatus } from "@/src/hooks/useOnlineStatus";
import { categoryById } from "@/src/lib/categories";
import { logActionError } from "@/src/lib/logger";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { fetchPlaylistItems, fetchVideoChunks, formatDuration, validateYoutubeResourceUrl } from "@/src/lib/youtube";
import { useRoutineStore } from "@/src/store/routineStore";
import { useToast } from "@/src/components/ToastProvider";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { EmptyState } from "@/src/components/EmptyState";
import { PageShell } from "@/src/components/PageShell";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { InfoBanner } from "@/src/components/InfoBanner";
import { IconCircleButton } from "@/src/components/IconCircleButton";
import { SmallIconAction } from "@/src/components/SmallIconAction";
import { ModalShell } from "@/src/components/ModalShell";
import type { Category, Resource, ResourceType } from "@/src/types";

const sections = [
  { id: "templates", label: "Routines", icon: Layers },
  { id: "categories", label: "Areas", icon: Tags },
  { id: "resources", label: "Videos", icon: ListVideo },
] as const;

const resourceTypes: { id: ResourceType; label: string; icon: typeof ListVideo }[] = [
  { id: "youtube-playlist", label: "Playlist", icon: ListVideo },
  { id: "youtube-video", label: "Video", icon: Video },
];

type ResourceDraft = {
  id?: string;
  title: string;
  type: ResourceType;
  categoryId: string;
};

export default function ManageScreen() {
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
  const dark = mode === "dark";
  const theme = appTheme(mode);
  const toast = useToast();
  const [section, setSection] = useState<(typeof sections)[number]["id"]>("templates");
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

  return (
    <PageShell theme={theme}>
      <ScreenHeader
        eyebrow="Your Library"
        title="Library"
        theme={theme}
        actions={<ScreenHelpButton
          title="Library"
          intro="Library keeps the routines, areas, and videos you reuse."
          steps={[
            { title: "Routines", body: "Create a routine once and reuse it every day." },
            { title: "Areas", body: "Areas group work like DSA, gym, study, or recovery." },
            { title: "Videos", body: "Load YouTube playlists or videos once, then add them to plans." },
          ]}
          illustration="screen-manage"
          theme={theme}
        />}
      />

      {!canBackup && <CacheBanner theme={theme} />}

      <SegmentedTabs
        items={sections.map((item) => ({ ...item, id: item.id }))}
        activeId={section}
        onChange={(next) => setSection(next)}
        theme={theme}
      />

          <View className="mt-3 flex-row gap-2">
            <View className="flex-[3] flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Search size={16} color={theme.mutedText} />
              <TextInput className="font-SatoshiMedium flex-1 py-3 text-sm" style={{ color: theme.text }} placeholderTextColor={theme.mutedText} value={query} onChangeText={setQuery} placeholder={`Search ${section === "templates" ? "routines" : section === "categories" ? "areas" : "videos"}`} />
            </View>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl px-2"
              style={{ backgroundColor: theme.accent }}
              onPress={section === "templates" ? addTemplate : section === "categories" ? startCategoryCreate : startResourceCreate}
            >
              <Plus size={15} color="#0B0D10" />
              <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                  {section === "templates" ? "New" : section === "categories" ? "New" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {section === "templates" && (
            <View className="mt-5 gap-3">
              {visibleTemplates.map((template) => (
                  <View key={template.id} className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <TouchableOpacity className="flex-row items-center justify-between gap-3" onPress={() => router.push(`/template-editor?templateId=${template.id}`)}>
                      <View className="flex-1">
                        <Text className="font-SpaceGroteskBold text-lg" style={{ color: theme.text }}>
                          {template.name}
                        </Text>
                        <Text className="font-SatoshiMedium mt-1 text-xs" numberOfLines={2} style={{ color: theme.mutedText }}>
                          {template.description ?? "Edit activities and active days."}
                        </Text>
                      </View>
                      <Text className="font-SatoshiBlack text-xs" style={{ color: theme.primary }}>
                        {template.blocks.length} activities
                      </Text>
                      <Pencil size={14} color={theme.mutedText} />
                    </TouchableOpacity>
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="font-SatoshiBold text-[11px]" style={{ color: theme.mutedText }}>
                        Days: {daysLabel(template.dayRules)}
                      </Text>
                      <IconCircleButton
                        icon={<Trash2 size={15} color="#EF4444" />}
                        onPress={() => removeTemplate(template.id)}
                        theme={theme}
                        backgroundColor="#EF44441A"
                        borderColor="#EF444455"
                      />
                    </View>
                  </View>
                ))}
              {!visibleTemplates.length && (
                <EmptyState
                  title={searchText ? "No routines found with this name" : "No routines yet."}
                  body={searchText ? "Try a different routine name or clear the search." : "Create a routine once and reuse it every day."}
                  illustration="onboarding-calendar"
                  theme={theme}
                />
              )}
            </View>
          )}

          {section === "categories" && (
            <View className="mt-5 gap-3">
              {categoryDraft && (
                <View className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.primary }}>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                      {categoryDraft.id ? "Edit area" : "New area"}
                    </Text>
                    <IconCircleButton
                      icon={<X size={15} color={theme.mutedText} />}
                      onPress={() => setCategoryDraft(null)}
                      theme={theme}
                    />
                  </View>
                  <View className="mt-3 flex-row items-start gap-3">
                    <TouchableOpacity className="w-1/5 items-center" onPress={() => setColorPickerOpen(true)}>
                      <View className="h-14 w-14 rounded-2xl border" style={{ backgroundColor: normalizeColor(categoryDraft.color), borderColor: theme.border }} />
                      <Text className="font-SatoshiBlack mt-2 text-[10px]" style={{ color: normalizeColor(categoryDraft.color) }}>
                        {normalizeColor(categoryDraft.color)}
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-1">
                      <Text className="font-SatoshiMedium mb-1 text-[10px]" style={{ color: theme.mutedText }}>
                        Name
                      </Text>
                      <TextInput className="font-SatoshiBlack rounded-2xl border px-3 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} value={categoryDraft.label} onChangeText={(label) => setCategoryDraft((current) => (current ? { ...current, label } : current))} placeholder="Area name" placeholderTextColor={theme.mutedText} />
                    </View>
                  </View>
                  <View className="mt-3 flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                    <Palette size={14} color={theme.mutedText} />
                    <TextInput className="font-SatoshiBlack flex-1 py-3 text-sm uppercase" style={{ color: normalizeColor(categoryDraft.color) }} value={categoryDraft.color} onChangeText={(color) => setCategoryDraft((current) => (current ? { ...current, color } : current))} placeholder="#38BDF8" placeholderTextColor={theme.mutedText} autoCapitalize="characters" maxLength={7} />
                    <TouchableOpacity className="rounded-xl px-3 py-2" style={{ backgroundColor: theme.surfaceAlt }} onPress={() => setColorPickerOpen(true)}>
                      <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.text }}>
                        Pick
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="mt-3 flex-row items-start gap-2 rounded-2xl border p-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                    <Info size={14} color={theme.primary} />
                    <Text className="font-SatoshiMedium flex-1 text-[11px] leading-4" style={{ color: theme.mutedText }}>
                      Area names are unique even if the letter case is different.
                    </Text>
                  </View>
                  <TouchableOpacity className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: theme.accent }} onPress={saveCategory}>
                    <Save size={15} color="#0B0D10" />
                    <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
                      Save area
                    </Text>
                  </TouchableOpacity>
                  <ColorPickerModal
                    visible={colorPickerOpen}
                    color={normalizeColor(categoryDraft.color)}
                    theme={theme}
                    onClose={() => setColorPickerOpen(false)}
                    onChange={(color) => setCategoryDraft((current) => (current ? { ...current, color } : current))}
                  />
                </View>
              )}

              {visibleCategories.map((category) => (
                  <View key={category.id} className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-row flex-1 items-center gap-3">
                        <View className="h-11 w-11 rounded-2xl border" style={{ backgroundColor: normalizeColor(category.color), borderColor: theme.border }} />
                        <View className="flex-1">
                          <Text className="font-SpaceGroteskBold text-lg" style={{ color: theme.text }}>
                            {category.label}
                          </Text>
                          <Text className="font-SatoshiBold mt-1 text-[11px]" style={{ color: theme.mutedText }}>
                            {resources.filter((resource) => resource.categoryId === category.id).length} video lists - {templates.filter((template) => template.blocks.some((block) => block.categoryId === category.id)).length} routines
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                            <IconCircleButton
                          icon={<Pencil size={14} color={theme.text} />}
                          onPress={() => setCategoryDraft({ id: category.id, label: category.label, color: category.color })}
                          theme={theme}
                        />
                        <IconCircleButton
                          icon={<Trash2 size={14} color="#EF4444" />}
                          onPress={() => removeCategory(category.id)}
                          theme={theme}
                          backgroundColor="#EF44441A"
                          borderColor="#EF444455"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              {!visibleCategories.length && (
                <EmptyState
                  title={searchText ? "No areas found with this name" : "No areas yet."}
                  body={searchText ? "Try a different area name or clear the search." : "Add areas like DSA, gym, study, or recovery."}
                  illustration="empty-organize-files"
                  theme={theme}
                />
              )}
            </View>
          )}

          {section === "resources" && (
            <View className="mt-5">
              <View className="gap-4">
                {resourceDraft && (
                  <ResourceDraftCard
                    draft={resourceDraft}
                    categories={categories}
                    categoryOpen={resourceCategoryOpen}
                    theme={theme}
                    onClose={() => {
                      setResourceDraft(null);
                      setResourceCategoryOpen(false);
                    }}
                    onToggleCategory={() => setResourceCategoryOpen((value) => !value)}
                    onChange={(patch) => setResourceDraft((current) => (current ? { ...current, ...patch } : current))}
                    onSave={saveResourceDraft}
                  />
                )}
                {visibleResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    theme={theme}
                    categoryLabel={categoryById(categories, resource.categoryId).label}
                    open={openResourceIds[resource.id] ?? false}
                    page={pageByResource[resource.id] ?? 0}
                    loading={loadingResourceId === resource.id}
                    urlValue={urlInputs[resource.id] ?? resource.url ?? ""}
                    chunkValue={chunkInputs[resource.id] ?? String(resource.chunkMinutes ?? 30)}
                    onToggle={() => setOpenResourceIds((current) => ({ ...current, [resource.id]: !(current[resource.id] ?? false) }))}
                    onEdit={() => startResourceEdit(resource)}
                    onUrlChange={(value) => setUrlInputs((current) => ({ ...current, [resource.id]: value }))}
                    onChunkChange={(value) => setChunkInputs((current) => ({ ...current, [resource.id]: value.replace(/\D/g, "") }))}
                    onSave={() => saveResourceLink(resource)}
                    onCopy={() => copyResourceLink(resource)}
                    onFetch={() => fetchResource(resource)}
                    onDelete={() => removeResource(resource.id)}
                    onClear={() => removeItems(resource.id)}
                    onPage={(page) => setPageByResource((current) => ({ ...current, [resource.id]: page }))}
                  />
                ))}
                {!visibleResources.length && !resourceDraft && (
                  <EmptyState
                    title={searchText ? "No videos found with this name" : "No videos yet."}
                    body={searchText ? "Try a different video, playlist, or area name." : "Add a YouTube playlist or video to begin."}
                    illustration="empty-tasks"
                    theme={theme}
                  />
                )}
              </View>
            </View>
          )}
    </PageShell>
  );
}

function daysLabel(dayRules: number[]) {
  if (!dayRules.length) return "Manual";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayRules.map((day) => names[day]).filter(Boolean).join(", ");
}

function normalizeColor(color: string) {
  const value = color.trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#38BDF8";
}

function CacheBanner({ theme }: { theme: ReturnType<typeof appTheme> }) {
  return (
    <InfoBanner
      title="Backup pending"
      body="You are offline. Your changes are saved on this phone."
      theme={theme}
      accent="warning"
    />
  );
}


function ColorPickerModal({ visible, color, theme, onClose, onChange }: { visible: boolean; color: string; theme: ReturnType<typeof appTheme>; onClose: () => void; onChange: (color: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
        <View className="rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <ColorPicker value={color} sliderThickness={22} thumbSize={26} onCompleteJS={(colors) => onChange(colors.hex)}>
            <Panel1 style={{ height: 180, borderRadius: 16, marginTop: 18 }} />
            <HueSlider style={{ height: 24, borderRadius: 12, marginTop: 18 }} />
            <Preview hideInitialColor colorFormat="hex" style={{ height: 44, borderRadius: 14, marginTop: 18 }} textStyle={{ fontWeight: "800" }} />
          </ColorPicker>
          <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onClose}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ResourceDraftCard({
  draft,
  categories,
  categoryOpen,
  theme,
  onClose,
  onToggleCategory,
  onChange,
  onSave,
}: {
  draft: ResourceDraft | null;
  categories: Category[];
  categoryOpen: boolean;
  theme: ReturnType<typeof appTheme>;
  onClose: () => void;
  onToggleCategory: () => void;
  onChange: (patch: Partial<ResourceDraft>) => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  const selected = categoryById(categories, draft.categoryId);

  return (
        <View className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.primary }}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
                {draft.id ? "Edit video list" : "New video list"}
              </Text>
              <Text className="font-SatoshiMedium mt-1 text-xs leading-5" style={{ color: theme.mutedText }}>
                Pick where these videos belong.
              </Text>
            </View>
            <IconCircleButton
              icon={<X size={17} color={theme.text} />}
              onPress={onClose}
              theme={theme}
              backgroundColor={theme.input}
            />
          </View>

          <View className="mt-5 flex-row gap-2">
            {resourceTypes.map((type) => {
              const active = draft.type === type.id;
              const Icon = type.icon;
              return (
                <TouchableOpacity key={type.id} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3" style={{ backgroundColor: active ? theme.accent : theme.input, borderColor: active ? theme.accent : theme.border }} onPress={() => onChange({ type: type.id })}>
                  <Icon size={15} color={active ? "#0B0D10" : theme.mutedText} />
                  <Text className="font-SatoshiBlack text-xs" style={{ color: active ? "#0B0D10" : theme.mutedText }}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-4 rounded-2xl border px-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
            <TextInput className="font-SatoshiMedium py-4 text-sm" style={{ color: theme.text }} placeholderTextColor={theme.mutedText} value={draft.title} onChangeText={(title) => onChange({ title })} placeholder="Video list name" />
          </View>

          <TouchableOpacity className="mt-3 flex-row items-center justify-between rounded-2xl border px-4 py-4" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={onToggleCategory}>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
              <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                {selected.label}
              </Text>
            </View>
            <ChevronDown size={16} color={theme.mutedText} />
          </TouchableOpacity>
          {categoryOpen && (
            <ScrollView className="mt-2 rounded-2xl border p-2" style={{ backgroundColor: theme.input, borderColor: theme.border, maxHeight: 244 }} nestedScrollEnabled>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className="flex-row items-center gap-2 rounded-xl px-3 py-3"
                  style={{ backgroundColor: draft.categoryId === category.id ? `${category.color}22` : "transparent" }}
                  onPress={() => {
                    onChange({ categoryId: category.id });
                    onToggleCategory();
                  }}
                >
                  <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onSave}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
  );
}

function ResourceCard({
  resource,
  theme,
  categoryLabel,
  open,
  page,
  loading,
  urlValue,
  chunkValue,
  onToggle,
  onEdit,
  onUrlChange,
  onChunkChange,
  onSave,
  onCopy,
  onFetch,
  onDelete,
  onClear,
  onPage,
}: {
  resource: Resource;
  theme: ReturnType<typeof appTheme>;
  categoryLabel: string;
  open: boolean;
  page: number;
  loading: boolean;
  urlValue: string;
  chunkValue: string;
  onToggle: () => void;
  onEdit: () => void;
  onUrlChange: (value: string) => void;
  onChunkChange: (value: string) => void;
  onSave: () => void;
  onCopy: () => void;
  onFetch: () => void;
  onDelete: () => void;
  onClear: () => void;
  onPage: (page: number) => void;
}) {
  const [chunkInfoOpen, setChunkInfoOpen] = useState(false);
  const pageCount = Math.max(1, Math.ceil(resource.items.length / 5));
  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = resource.items.slice(safePage * 5, safePage * 5 + 5);
  const typeLabel = resource.type === "youtube-video" ? "Video chunks" : "Playlist";

  return (
    <View className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-SpaceGroteskBold text-lg" style={{ color: theme.text }}>
            {resource.title}
          </Text>
          <Text className="font-SatoshiBold mt-1 text-xs" style={{ color: theme.mutedText }}>
            {categoryLabel} - {resource.items.length} items - {typeLabel}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconCircleButton
            icon={<Copy size={14} color={theme.mutedText} />}
            onPress={onCopy}
            theme={theme}
          />
          <IconCircleButton
            icon={<Link size={14} color={theme.text} />}
            onPress={onToggle}
            theme={theme}
          />
          <IconCircleButton
            icon={<Pencil size={14} color={theme.text} />}
            onPress={onEdit}
            theme={theme}
          />
          <IconCircleButton
            icon={<Trash2 size={14} color="#EF4444" />}
            onPress={onDelete}
            theme={theme}
            backgroundColor="#EF44441A"
            borderColor="#EF444455"
          />
        </View>
      </View>

      {open && (
        <View className="mt-4">
          <View className="flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
            <Link size={15} color={theme.mutedText} />
            <TextInput className="font-SatoshiMedium flex-1 py-3 text-xs" style={{ color: theme.text }} placeholderTextColor={theme.mutedText} value={urlValue} onChangeText={onUrlChange} placeholder="Paste YouTube link" autoCapitalize="none" autoCorrect={false} />
          </View>

          {resource.type === "youtube-video" && (
            <View className="mt-3 flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <Video size={15} color={theme.mutedText} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                Chunk minutes
              </Text>
              <TextInput className="font-SatoshiBlack flex-1 py-3 text-xs" style={{ color: theme.text }} keyboardType="number-pad" value={chunkValue} onChangeText={onChunkChange} />
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceAlt }} onPress={() => setChunkInfoOpen(true)}>
                <Info size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-3 flex-row gap-2">
            <SmallIconAction label="Save" icon={<Save size={13} color={theme.text} />} onPress={onSave} theme={theme} />
            <SmallIconAction label="Copy" icon={<Copy size={13} color={theme.text} />} onPress={onCopy} theme={theme} />
            <SmallIconAction
              label="Load Videos"
              icon={loading ? <ActivityIndicator size="small" color={theme.primary} /> : <RefreshCw size={13} color={theme.primary} />}
              onPress={onFetch}
              theme={theme}
              tintColor={theme.primary}
            />
            <SmallIconAction
              label="Remove Videos"
              icon={<Eraser size={13} color="#F59E0B" />}
              onPress={onClear}
              theme={theme}
              backgroundColor="#F59E0B1A"
              borderColor="#F59E0B55"
              tintColor="#F59E0B"
            />
          </View>

          <View className="mt-3 gap-2">
            {visibleItems.map((item, index) => (
              <View key={item.id} className="flex-row gap-3 rounded-2xl p-3" style={{ backgroundColor: theme.input }}>
                <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                  <Text className="font-SatoshiBlack text-[10px]" style={{ color: theme.mutedText }}>
                    {safePage * 5 + index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-SatoshiBlack text-sm" numberOfLines={2} style={{ color: item.completed ? theme.mutedText : theme.text }}>
                    {item.title}
                  </Text>
                  <Text className="font-SatoshiBold mt-1 text-[11px]" style={{ color: theme.mutedText }}>
                    {formatDuration(item.durationSeconds)} {item.completed ? "- completed" : ""}
                  </Text>
                </View>
              </View>
            ))}
            {!visibleItems.length && (
              <Text className="font-SatoshiMedium rounded-2xl p-3 text-xs leading-5" style={{ backgroundColor: theme.input, color: theme.mutedText }}>
                Save a link, then fetch to load items here.
              </Text>
            )}
          </View>

          {resource.items.length > 5 && (
            <View className="mt-3 flex-row items-center justify-between">
              <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }} disabled={safePage === 0} onPress={() => onPage(Math.max(0, safePage - 1))}>
                <Text className="font-SatoshiBlack text-xs" style={{ color: safePage === 0 ? theme.mutedText : theme.text }}>
                  Prev
                </Text>
              </TouchableOpacity>
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                {safePage + 1}/{pageCount}
              </Text>
              <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }} disabled={safePage >= pageCount - 1} onPress={() => onPage(Math.min(pageCount - 1, safePage + 1))}>
                <Text className="font-SatoshiBlack text-xs" style={{ color: safePage >= pageCount - 1 ? theme.mutedText : theme.text }}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ModalShell
            visible={chunkInfoOpen}
            title="Chunk minutes"
            subtitle="A long video becomes smaller checklist items. Example: a 6 hour video with 30 minutes creates 12 chunks for planning."
            theme={theme}
            onClose={() => setChunkInfoOpen(false)}
          >
            <View className="pt-4" />
          </ModalShell>
        </View>
      )}
    </View>
  );
}
