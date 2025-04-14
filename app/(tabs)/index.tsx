"use client";

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from "react-native";
import moment from "moment";
import scheduleData from "@/data/schedule.json";
import {
  BookOpen,
  Briefcase,
  Film,
  Lightbulb,
  Dumbbell,
  Gamepad2,
  Coffee,
  Sunrise,
  ShowerHead,
  Brain,
  Code,
  Music,
  Utensils,
  Moon,
  Sparkles,
} from "lucide-react-native";
import { MotiView } from "moti";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("Weekday");
  const [currentSchedule, setCurrentSchedule] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [nextActivity, setNextActivity] = useState(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Get the current day, time and identify the schedule type
  useEffect(() => {
    const updateSchedule = () => {
      const now = moment();
      const currentDay = now.format("dddd").toLowerCase();
      const currentTime = now.format("HH:mm");

      // Determine the schedule type based on day
      let scheduleType;
      if (["tuesday", "wednesday", "saturday"].includes(currentDay)) {
        scheduleType = "Karate Day";
      } else if (currentDay === "sunday") {
        scheduleType = "Sunday";
      } else {
        scheduleType = "Weekday";
      }

      // Set active tab based on current day type
      setActiveTab(scheduleType);

      // Get the schedule for today
      const todaySchedule = scheduleData[currentDay] || [];
      setCurrentSchedule(todaySchedule);

      // Find current activity
      const current = findCurrentActivity(todaySchedule, currentTime);
      setCurrentActivity(current);

      // Find next activity
      const next = findNextActivity(todaySchedule, currentTime);
      setNextActivity(next);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    };

    updateSchedule();

    // Update every minute
    const intervalId = setInterval(updateSchedule, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Function to find the current activity based on time
  const findCurrentActivity = (schedule, currentTime) => {
    for (const item of schedule) {
      const [startTime, endTime] = item.time.split(" - ");
      if (isTimeInRange(currentTime, startTime, endTime)) {
        return item;
      }
    }
    return null;
  };

  // Function to find the next activity
  const findNextActivity = (schedule, currentTime) => {
    for (const item of schedule) {
      const [startTime] = item.time.split(" - ");
      if (moment(startTime, "HH:mm").format("HH:mm") > currentTime) {
        return item;
      }
    }
    return null;
  };

  // Check if current time is within a range
  const isTimeInRange = (current, start, end) => {
    const currentMoment = moment(current, "HH:mm");
    const startMoment = moment(start, "HH:mm");
    const endMoment = moment(end, "HH:mm");
    return currentMoment >= startMoment && currentMoment <= endMoment;
  };

  // Function to get filtered schedule based on active tab
  const getFilteredSchedule = () => {
    const day = moment().format("dddd").toLowerCase();

    if (activeTab === "Weekday") {
      // Use current day if it's a weekday (Mon, Thu, Fri), otherwise default to Monday
      if (["monday", "thursday", "friday"].includes(day)) {
        return scheduleData[day] || [];
      }
      return scheduleData.monday || [];
    } else if (activeTab === "Karate Day") {
      // Use current day if it's a karate day, otherwise default to Tuesday
      if (["tuesday", "wednesday", "saturday"].includes(day)) {
        return scheduleData[day] || [];
      }
      return scheduleData.tuesday || [];
    } else {
      return scheduleData.sunday || [];
    }
  };

  // Get activity icon based on activity name and category
  const getActivityIcon = (activity, category) => {
    const size = 24;
    const color = "#000";
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
      activityLower.includes("code") ||
      activityLower.includes("programming")
    ) {
      return <Code size={size} color={color} />;
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

  // Get background color based on activity category
  const getActivityColor = (category) => {
    if (!category) return "#f3f4f6"; // Default gray

    switch (category) {
      case "Study":
        return "#dcfce7"; // Light green
      case "Work":
        return "#fee2e2"; // Light red
      case "Leisure":
        return "#dbeafe"; // Light blue
      case "Project":
        return "#fee2e2"; // Light red
      case "Fitness":
        return "#fef9c3"; // Light yellow
      case "Personal":
        return "#f3f4f6"; // Light gray
      default:
        return "#f3f4f6"; // Default gray
    }
  };

  // Format time for display
  const formatTimeForDisplay = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const hour = Number.parseInt(hours);
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes}`;
  };

  const filteredSchedule = getFilteredSchedule();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <Animated.ScrollView
        className="flex-1 px-5"
        style={{ opacity: fadeAnim }}
      >
        {/* Main header - Shows current activity or no activity */}
        <View className="mt-10">
          {currentActivity ? (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
            >
              <View className="flex-row items-center">
                <View className="mr-3">
                  {getActivityIcon(
                    currentActivity.activity,
                    currentActivity.category
                  )}
                </View>
                <Text className="text-5xl font-bold">
                  {currentActivity.activity}
                </Text>
              </View>
              <Text className="text-xl text-gray-700 mt-1 ml-10">
                Currently in progress • {currentActivity.time}
              </Text>
            </MotiView>
          ) : (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
            >
              <Text className="text-5xl font-bold">No activity now</Text>
              <Text className="text-xl text-gray-700 mt-1">
                Check your schedule below
              </Text>
            </MotiView>
          )}

          <View className="items-end">
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="bg-gray-100 rounded-full px-4 py-2 mt-2"
            >
              <Text className="text-base font-medium">
                {moment().format("dddd")}
              </Text>
            </MotiView>
          </View>
        </View>

        {/* Up next section */}
        <View className="mt-4">
          <Text className="text-lg font-bold tracking-wide">UP NEXT</Text>
          {nextActivity ? (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 15,
                delay: 200,
              }}
              className="bg-gray-100 rounded-xl p-4 mt-2"
            >
              <View className="flex-row items-center">
                <View className="mr-3">
                  {getActivityIcon(
                    nextActivity.activity,
                    nextActivity.category
                  )}
                </View>
                <View>
                  <Text className="font-bold text-lg">
                    {nextActivity.activity}
                  </Text>
                  <Text className="text-gray-600">{nextActivity.time}</Text>
                </View>
              </View>
            </MotiView>
          ) : (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 15,
                delay: 200,
              }}
              className="bg-gray-100 rounded-xl p-4 mt-2"
            >
              <Text className="text-lg">No more activities today</Text>
            </MotiView>
          )}
        </View>

        {/* Day selector */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600, delay: 300 }}
          className="mt-6 flex-row border border-black rounded-lg overflow-hidden"
        >
          <TouchableOpacity
            className={`flex-1 py-3 items-center ${
              activeTab === "Weekday" ? "bg-black" : "bg-white"
            }`}
            onPress={() => setActiveTab("Weekday")}
          >
            <Text
              className={`font-semibold ${
                activeTab === "Weekday" ? "text-white" : "text-black"
              }`}
            >
              Weekday
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 items-center ${
              activeTab === "Karate Day" ? "bg-black" : "bg-white"
            } border-l border-r border-black`}
            onPress={() => setActiveTab("Karate Day")}
          >
            <Text
              className={`font-semibold ${
                activeTab === "Karate Day" ? "text-white" : "text-black"
              }`}
            >
              Karate Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 items-center ${
              activeTab === "Sunday" ? "bg-black" : "bg-white"
            }`}
            onPress={() => setActiveTab("Sunday")}
          >
            <Text
              className={`font-semibold ${
                activeTab === "Sunday" ? "text-white" : "text-black"
              }`}
            >
              Sunday
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* Schedule items with scrollable area */}
        <View className="mt-6 mb-20">
          <ScrollView
            className="max-h-96"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {filteredSchedule.map((item, index) => {
              const bgColor = getActivityColor(item.category);

              return (
                <MotiView
                  key={index}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", delay: 100 + index * 50 }}
                  className="mb-3"
                >
                  <View className="flex-row">
                    {/* Time Block - Made more compact */}
                    <View
                      style={{ backgroundColor: bgColor }}
                      className="p-3 rounded-xl w-[110px] justify-around flex flex-row items-center "
                    >
                      <Text className="font-medium text-sm text-gray-800">
                        {formatTimeForDisplay(item.time.split(" - ")[0])}
                      </Text>
                      <Text className="font-medium text-xs text-gray-500 my-0.5">
                        -
                      </Text>
                      <Text className="font-medium text-sm text-gray-800">
                        {formatTimeForDisplay(item.time.split(" - ")[1])}
                      </Text>
                    </View>

                    {/* Activity Block - Better spacing and smaller font */}
                    <View
                      style={{ backgroundColor: bgColor }}
                      className="p-3 rounded-xl ml-2 flex-1 flex-row items-center justify-between"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold text-base text-gray-800">
                          {item.activity}
                        </Text>
                        {item.duration && (
                          <Text className="text-xs text-gray-700 mt-0.5">
                            {item.duration} min • {item.category}
                          </Text>
                        )}
                      </View>
                      <View className="ml-2 bg-white/50 p-1.5 rounded-full">
                        {getActivityIcon(item.activity, item.category)}
                      </View>
                    </View>
                  </View>
                </MotiView>
              );
            })}
          </ScrollView>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
