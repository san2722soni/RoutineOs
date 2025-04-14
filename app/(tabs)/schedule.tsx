"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Animated,
} from "react-native";
import moment from "moment";
import scheduleData from "@/data/schedule.json";
import {
  CheckCircle,
  Sunrise,
  Dumbbell,
  ShowerHead,
  BookOpen,
  Briefcase,
  Film,
  Lightbulb,
  Brain,
  Gamepad2,
  Coffee,
  Music,
  Utensils,
  Moon,
  Sparkles,
} from "lucide-react-native";
import { MotiView, MotiText } from "moti";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayFullNames = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
  Sun: "sunday",
};

export default function WeeklyScheduleScreen() {
  const [activeDay, setActiveDay] = useState(moment().format("ddd"));
  const [schedules, setSchedules] = useState([]);
  const [enabledActivities, setEnabledActivities] = useState({});
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize schedule data from JSON when component mounts or day changes
  useEffect(() => {
    const dayFullName = dayFullNames[activeDay] || "monday";
    const daySchedule = scheduleData[dayFullName] || [];

    // Transform data for our component
    const formattedSchedules = daySchedule.map((item, index) => {
      // Format time range to display format
      const [startTime, endTime] = item.time.split(" - ");
      const formattedTimeRange = formatTimeRange(startTime, endTime);

      return {
        id: index + 1,
        timeRange: formattedTimeRange,
        activity: item.activity,
        rawTime: item.time,
        duration: item.duration || 0,
        category: item.category || "Personal",
        enabled:
          enabledActivities[`${activeDay}-${index}`] !== undefined
            ? enabledActivities[`${activeDay}-${index}`]
            : item.isEnabled || false,
        colorClass: getCategoryColor(item.category),
      };
    });

    setSchedules(formattedSchedules);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scroll to top when day changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [activeDay, enabledActivities]);

  // Format time range for display
  const formatTimeRange = (startTime, endTime) => {
    const formatTime = (time) => {
      const [hours, minutes] = time.split(":");
      const hour = Number.parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} – ${formatTime(endTime)}`;
  };

  // Get background color based on category
  const getCategoryColor = (category) => {
    if (!category) return "#f3f4f6"; // Default gray

    switch (category.toLowerCase()) {
      case "fitness":
        return "#fef9c3"; // Light yellow
      case "study":
        return "#dcfce7"; // Light green
      case "leisure":
        return "#dbeafe"; // Light blue
      case "work":
        return "#fee2e2"; // Light red
      case "project":
        return "#fee2e2"; // Light red
      case "personal":
        return "#fef3c7"; // Light peach
      default:
        return "#f3f4f6"; // Gray
    }
  };

  // Get activity icon based on activity name and category
  const getActivityIcon = (activity, category) => {
    const size = 20;
    const color = "#4B5563";
    const activityLower = activity.toLowerCase();

    if (
      activityLower.includes("wake up") ||
      activityLower.includes("freshen")
    ) {
      return <Sunrise size={size} color={color} />;
    } else if (
      activityLower.includes("ShowerHead") ||
      activityLower.includes("bath")
    ) {
      return <ShowerHead size={size} color={color} />;
    } else if (
      activityLower.includes("cs50") ||
      activityLower.includes("lecture")
    ) {
      return <BookOpen size={size} color={color} />;
    } else if (
      activityLower.includes("job") ||
      activityLower.includes("work")
    ) {
      return <Briefcase size={size} color={color} />;
    } else if (
      activityLower.includes("anime") ||
      activityLower.includes("movie") ||
      activityLower.includes("series")
    ) {
      return <Film size={size} color={color} />;
    } else if (activityLower.includes("project")) {
      return <Lightbulb size={size} color={color} />;
    } else if (
      activityLower.includes("exercise") ||
      activityLower.includes("football") ||
      activityLower.includes("fitness")
    ) {
      return <Dumbbell size={size} color={color} />;
    } else if (
      activityLower.includes("valorant") ||
      activityLower.includes("game")
    ) {
      return <Gamepad2 size={size} color={color} />;
    } else if (
      activityLower.includes("study") ||
      activityLower.includes("reading")
    ) {
      return <Brain size={size} color={color} />;
    } else if (
      activityLower.includes("music") ||
      activityLower.includes("listen")
    ) {
      return <Music size={size} color={color} />;
    } else if (
      activityLower.includes("dinner") ||
      activityLower.includes("breakfast") ||
      activityLower.includes("lunch")
    ) {
      return <Utensils size={size} color={color} />;
    } else if (
      activityLower.includes("sleep") ||
      activityLower.includes("rest")
    ) {
      return <Moon size={size} color={color} />;
    } else if (
      activityLower.includes("relax") ||
      activityLower.includes("break")
    ) {
      return <Sparkles size={size} color={color} />;
    } else {
      return <Coffee size={size} color={color} />;
    }
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes) return "";

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hr${hours > 1 ? "" : ""}`;
    }
  };

  // Toggle activity enabled status
  const toggleSchedule = (id) => {
    const item = schedules.find((schedule) => schedule.id === id);
    if (item) {
      const key = `${activeDay}-${id - 1}`;
      setEnabledActivities((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Heading with proper margin */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 800 }}
        className="mt-12 mx-4"
      >
        <Text className="text-4xl font-bold">My Weekly Routine</Text>
      </MotiView>

      {/* Days Tabs - Improved horizontal day selector */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        className="flex flex-row justify-between items-center px-6 pt-6 pb-2"
      >
        {days.map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => setActiveDay(day)}
            className="items-center"
          >
            <MotiText
              animate={{
                scale: activeDay === day ? 1.1 : 1,
                fontWeight: activeDay === day ? "700" : "500",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className={`text-lg ${
                activeDay === day ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {day}
            </MotiText>
            {activeDay === day && (
              <MotiView
                from={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="h-1 w-8 bg-black mt-1.5 rounded-full"
              />
            )}
          </TouchableOpacity>
        ))}
      </MotiView>

      <View className="h-[1px] bg-gray-200 w-full" />

      {/* Schedule List - Two-row layout with time and activity on top row */}
      <Animated.ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
      >
        {schedules.map((item, index) => (
          <MotiView
            key={item.id}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", delay: index * 30, damping: 18 }}
            className="mb-3 rounded-sm shadow-xl px-1 py-3 mt-3 "
            style={{ backgroundColor: item.colorClass }}
          >
            {/* First row: Time and Activity */}
            <View className="flex-row items-center justify-between w-full">
              <Text className="text-base font-medium text-gray-800 w-28 ml-4">
                {item.rawTime}
              </Text>

              <Switch
                trackColor={{ false: "#D1D5DB", true: "#202020" }}
                thumbColor={item.enabled ? "#FFFFFF" : "#202020"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={() => toggleSchedule(item.id)}
                value={item.enabled}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>

            {/* Second row: Duration/Category and Switch */}
            <View className="flex-row-reverse items-center justify-between mt-1.5">
              <Text className="text-xs text-gray-600">
                {formatDuration(item.duration)} | {item.category}
              </Text>

              <View className="flex-row items-center flex-1">
                <View className="mr-2 bg-white/50 p-1 rounded-full">
                  {getActivityIcon(item.activity, item.category)}
                </View>
                <Text className="text-base font-medium text-gray-900 flex-1">
                  {item.activity}
                </Text>
              </View>
            </View>
          </MotiView>
        ))}
        <View className="h-20" />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
