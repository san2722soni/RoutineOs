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
      const currentTime = now.format("h:mm A"); // Use 12-hour format with AM/PM to match JSON

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
    if (!schedule || !Array.isArray(schedule)) return null;
    
    // Convert current time to a moment object in 12-hour format
    const currentMoment = moment(currentTime, "h:mm A");
    
    for (const item of schedule) {
      if (!item.isEnabled) continue;
      
      const timeRange = item.time;
      const [startTime, endTime] = timeRange.split(" - ");
      
      // Handle AM/PM appropriately
      let startMoment, endMoment;
      
      // If end time has AM/PM but start time doesn't, apply end time's AM/PM to start time
      if (
        (endTime.includes("AM") || endTime.includes("PM")) && 
        !(startTime.includes("AM") || startTime.includes("PM"))
      ) {
        const meridian = endTime.includes("AM") ? "AM" : "PM";
        startMoment = moment(startTime + " " + meridian, "h:mm A");
      } else {
        startMoment = moment(startTime, "h:mm A");
      }
      
      endMoment = moment(endTime, "h:mm A");
      
      // Check if current time is within this range
      if (
        currentMoment.isSameOrAfter(startMoment) && 
        currentMoment.isSameOrBefore(endMoment)
      ) {
        return item;
      }
    }
    return null;
  };

  // Function to find the next activity
  const findNextActivity = (schedule, currentTime) => {
    if (!schedule || !Array.isArray(schedule)) return null;
    
    // Convert current time to a moment object in 12-hour format
    const currentMoment = moment(currentTime, "h:mm A");
    
    // Filter enabled activities
    const enabledActivities = schedule.filter(item => item.isEnabled);
    
    // Sort activities by start time
    const sortedActivities = [...enabledActivities].sort((a, b) => {
      const aTimeRange = a.time.split(" - ");
      const bTimeRange = b.time.split(" - ");
      
      let aStartTime = aTimeRange[0];
      let bStartTime = bTimeRange[0];
      
      // Handle AM/PM appropriately
      if (!(aStartTime.includes("AM") || aStartTime.includes("PM"))) {
        const aEndTime = aTimeRange[1];
        const meridian = aEndTime.includes("AM") ? "AM" : "PM";
        aStartTime += " " + meridian;
      }
      
      if (!(bStartTime.includes("AM") || bStartTime.includes("PM"))) {
        const bEndTime = bTimeRange[1];
        const meridian = bEndTime.includes("AM") ? "AM" : "PM";
        bStartTime += " " + meridian;
      }
      
      const aMoment = moment(aStartTime, "h:mm A");
      const bMoment = moment(bStartTime, "h:mm A");
      
      return aMoment - bMoment;
    });
    
    // Find the next activity after current time
    for (const item of sortedActivities) {
      const [startTime, endTime] = item.time.split(" - ");
      
      // Handle AM/PM appropriately
      let startMoment;
      
      if (!(startTime.includes("AM") || startTime.includes("PM"))) {
        const meridian = endTime.includes("AM") ? "AM" : "PM";
        startMoment = moment(startTime + " " + meridian, "h:mm A");
      } else {
        startMoment = moment(startTime, "h:mm A");
      }
      
      if (startMoment.isAfter(currentMoment)) {
        return item;
      }
    }
    
    return null;
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
    const activityLower = activity?.toLowerCase() || "";
    const categoryLower = category?.toLowerCase() || "";

    if (activityLower.includes("wake up") || activityLower.includes("freshen")) {
      return <Sunrise size={size} color={color} />;
    } else if (activityLower.includes("shower") || activityLower.includes("bath")) {
      return <ShowerHead size={size} color={color} />;
    } else if (activityLower.includes("cs50") || activityLower.includes("lecture")) {
      return <BookOpen size={size} color={color} />;
    } else if (activityLower.includes("job") || activityLower.includes("work") || categoryLower === "work") {
      return <Briefcase size={size} color={color} />;
    } else if (activityLower.includes("anime") || activityLower.includes("movie") || activityLower.includes("series")) {
      return <Film size={size} color={color} />;
    } else if (activityLower.includes("project")) {
      return <Lightbulb size={size} color={color} />;
    } else if (
      activityLower.includes("exercise") ||
      activityLower.includes("football") ||
      activityLower.includes("fitness") ||
      activityLower.includes("karate") ||
      categoryLower === "fitness"
    ) {
      return <Dumbbell size={size} color={color} />;
    } else if (activityLower.includes("valorant") || activityLower.includes("game")) {
      return <Gamepad2 size={size} color={color} />;
    } else if (activityLower.includes("study") || activityLower.includes("reading") || categoryLower === "study") {
      return <Brain size={size} color={color} />;
    } else if (activityLower.includes("code") || activityLower.includes("programming")) {
      return <Code size={size} color={color} />;
    } else if (activityLower.includes("music") || activityLower.includes("listen")) {
      return <Music size={size} color={color} />;
    } else if (
      activityLower.includes("dinner") ||
      activityLower.includes("breakfast") ||
      activityLower.includes("lunch") ||
      activityLower.includes("snack")
    ) {
      return <Utensils size={size} color={color} />;
    } else if (activityLower.includes("sleep") || activityLower.includes("wind down")) {
      return <Moon size={size} color={color} />;
    } else if (activityLower.includes("relax") || activityLower.includes("break")) {
      return <Sparkles size={size} color={color} />;
    } else {
      return <Coffee size={size} color={color} />;
    }
  };

  // Get background color based on activity category
  const getActivityColor = (category) => {
    if (!category) return "#f3f4f6"; // Default gray
    
    const categoryLower = category.toLowerCase();

    switch (categoryLower) {
      case "study":
        return "#dcfce7"; // Light green
      case "work":
        return "#fee2e2"; // Light red
      case "leisure":
        return "#dbeafe"; // Light blue
      case "project":
        return "#fef3c7"; // Light amber
      case "fitness":
        return "#fef9c3"; // Light yellow
      case "personal":
        return "#f3f4f6"; // Light gray
      case "leisure/project":
      case "leisure/work": 
      case "work/leisure":
        return "#fbcfe8"; // Light pink
      default:
        return "#f3f4f6"; // Default gray
    }
  };

  // Format time for display
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return "";
    
    // Extract just the time part, removing AM/PM
    let formattedTime = timeString;
    if (timeString.includes("AM") || timeString.includes("PM")) {
      formattedTime = timeString.split(" ")[0];
    }
    
    return formattedTime;
  };

  const filteredSchedule = getFilteredSchedule();

  // For debugging - log current time in the format expected by the app
  const currentTimeDebug = moment().format("h:mm A");
  console.log("Current time: ", currentTimeDebug);

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
                {moment().format("dddd")} • {moment().format("h:mm A")}
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
            {filteredSchedule && filteredSchedule.map((item, index) => {
              // Skip disabled items
              if (!item.isEnabled) return null;
              
              const bgColor = getActivityColor(item.category);
              
              // Parse time range
              const [startDisplay, endDisplay] = item.time.split(" - ");

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
                      className="p-3 rounded-xl w-28 justify-around flex flex-row items-center"
                    >
                      <Text className="font-medium text-sm text-gray-800">
                        {formatTimeForDisplay(startDisplay)}
                      </Text>
                      <Text className="font-medium text-xs text-gray-500 mx-1">
                        -
                      </Text>
                      <Text className="font-medium text-sm text-gray-800">
                        {formatTimeForDisplay(endDisplay)}
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