import { EmptyState } from "@/src/components/EmptyState";
import { IconCircleButton } from "@/src/components/IconCircleButton";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { PageShell } from "@/src/components/PageShell";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { categoryById } from "@/src/lib/categories";
import { Info, Layers, ListVideo, Palette, Pencil, Plus, Save, Search, Tags, Trash2, X } from "lucide-react-native";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { ColorPickerModal } from "./ColorPickerModal";
import { daysLabel, normalizeColor } from "./format";
import { ResourceCard } from "./ResourceCard";
import { ResourceDraftCard } from "./ResourceDraftCard";
import { useManageScreen } from "./useManageScreen";
const sections = [
  { id: "templates", label: "Routines", icon: Layers },
  { id: "categories", label: "Areas", icon: Tags },
  { id: "resources", label: "Videos", icon: ListVideo },
] as const;
export default function ManageScreen() {
  const { router, categories, templates, resources, theme, section, setSection, resourceDraft, setResourceDraft, categoryDraft, setCategoryDraft, colorPickerOpen, setColorPickerOpen, resourceCategoryOpen, setResourceCategoryOpen, query, setQuery, openResourceIds, setOpenResourceIds, urlInputs, setUrlInputs, chunkInputs, setChunkInputs, loadingResourceId, pageByResource, setPageByResource, canBackup, searchText, visibleTemplates, visibleCategories, visibleResources, addTemplate, removeTemplate, startCategoryCreate, saveCategory, removeCategory, startResourceCreate, startResourceEdit, saveResourceDraft, saveResourceLink, fetchResource, removeResource, removeItems, copyResourceLink } = useManageScreen();
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

      {!canBackup && <OfflineBanner theme={theme} />}

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
