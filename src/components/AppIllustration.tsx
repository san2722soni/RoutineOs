import type { ComponentType } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import EmptyNoData from "@/assets/empty/no_data.svg";
import EmptyOrganizeFiles from "@/assets/empty/organize_files.svg";
import EmptyTasks from "@/assets/empty/tasks.svg";
import InfoDashboard from "@/assets/info_modals/dashboard.svg";
import InfoGuide from "@/assets/info_modals/guide.svg";
import InfoLearning from "@/assets/info_modals/learning.svg";
import InfoQuestions from "@/assets/info_modals/questions.svg";
import OnboardingCalendar from "@/assets/onboarding/calendar.svg";
import OnboardingPlanning from "@/assets/onboarding/planning.svg";
import OnboardingProductivity from "@/assets/onboarding/productivity.svg";
import OnboardingReminders from "@/assets/onboarding/reminders.svg";
import OnboardingSchedule from "@/assets/onboarding/schedule.svg";
import ManageOrganizeFiles from "@/assets/screen_specific/manage_organize_files.svg";
import PlanCalendar from "@/assets/screen_specific/plan_calendar.svg";
import SettingsPreferences from "@/assets/screen_specific/settings_preferences.svg";
import TodayCompletedTasks from "@/assets/screen_specific/today_completed_tasks.svg";
import ReminderIllustration from "@/assets/reminder.svg";
import LocationSearchIllustration from "@/assets/location_search.svg";
import YouHereIllustration from "@/assets/you_here.svg";
import TaskHomeIllustration from "@/assets/task_home.svg";

const illustrations = {
  "empty-no-data": EmptyNoData,
  "empty-organize-files": EmptyOrganizeFiles,
  "empty-tasks": EmptyTasks,
  "info-dashboard": InfoDashboard,
  "info-guide": InfoGuide,
  "info-learning": InfoLearning,
  "info-questions": InfoQuestions,
  "onboarding-calendar": OnboardingCalendar,
  "onboarding-planning": OnboardingPlanning,
  "onboarding-productivity": OnboardingProductivity,
  "onboarding-reminders": OnboardingReminders,
  "onboarding-schedule": OnboardingSchedule,
  "screen-manage": ManageOrganizeFiles,
  "screen-plan": PlanCalendar,
  "screen-settings": SettingsPreferences,
  "screen-today": TodayCompletedTasks,
  reminder: ReminderIllustration,
  "location-search": LocationSearchIllustration,
  "you-here": YouHereIllustration,
  "task-home": TaskHomeIllustration,
} satisfies Record<string, ComponentType<SvgProps>>;

export type IllustrationName = keyof typeof illustrations;

export function AppIllustration({
  name,
  size = 148,
  width,
  height,
  style,
}: {
  name: IllustrationName;
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Illustration = illustrations[name];

  return (
    <View pointerEvents="none" style={style}>
      <Illustration width={width ?? size} height={height ?? size} />
    </View>
  );
}
