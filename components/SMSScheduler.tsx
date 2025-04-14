// SMSScheduler.tsx
import { useEffect, useState } from 'react';
import * as SMS from 'expo-sms';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Activity {
  time: string;
  activity: string;
  isEnabled: boolean;
  duration: number;
  category: string;
  completed: boolean;
}

interface ScheduleData {
  [day: string]: Activity[];
}

export function useSMSScheduler() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load schedule data
  useEffect(() => {
    async function loadSchedule() {
      try {
        // In your app, you would load this from a file or API
        // For this example, I'm using the JSON you provided
        const scheduleData = require('../assets/schedule.json');
        setSchedule(scheduleData);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load schedule', err);
        setError('Failed to load schedule data');
        setIsLoading(false);
      }
    }

    loadSchedule();
  }, []);

  // Check SMS availability
  useEffect(() => {
    async function checkSMSAvailable() {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        setError('SMS is not available on this device');
      }
    }

    checkSMSAvailable();
  }, []);

  // Request notification permissions
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Notification permissions not granted');
      }
    }

    requestPermissions();
  }, []);

  // Schedule notifications for today
  useEffect(() => {
    if (!schedule) return;

    async function scheduleNotificationsForToday() {
      // Clear any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = new Date();
      const dayName = days[today.getDay()].toLowerCase();

      if (!schedule[dayName]) return;

      // Schedule each activity
      for (const activity of schedule[dayName]) {
        if (!activity.isEnabled) continue;

        const [startTime] = activity.time.split(' - ');
        const [hours, minutes] = startTime.replace(/\s*(AM|PM)\s*$/, '').split(':');
        
        // Parse time
        let hour = parseInt(hours);
        const minute = parseInt(minutes);
        
        // Handle AM/PM
        if (startTime.includes('PM') && hour < 12) {
          hour += 12;
        } else if (startTime.includes('AM') && hour === 12) {
          hour = 0;
        }

        // Create notification trigger time
        const triggerDate = new Date();
        triggerDate.setHours(hour, minute, 0);

        // Only schedule if time is in the future
        if (triggerDate > today) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Activity: ${activity.activity}`,
              body: `It's time for your ${activity.category} activity.`,
              data: { activity },
            },
            trigger: triggerDate,
          });
          
          console.log(`Scheduled notification for ${activity.activity} at ${triggerDate.toString()}`);
        }
      }
    }

    scheduleNotificationsForToday();
  }, [schedule]);

  // Send SMS function
  const sendActivitySMS = async (phoneNumber: string, activity: Activity) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('SMS is not available on this device');
      }

      const { result } = await SMS.sendSMSAsync(
        [phoneNumber],
        `Reminder: It's time for "${activity.activity}" (${activity.category})`
      );

      if (result === 'sent') {
        console.log(`SMS sent for activity: ${activity.activity}`);
        return true;
      } else {
        console.log(`SMS failed to send: ${result}`);
        return false;
      }
    } catch (err) {
      console.error('Error sending SMS', err);
      return false;
    }
  };

  // Listen for notification responses
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const activity = response.notification.request.content.data.activity as Activity;
      
      // Get saved phone number from storage
      const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      
      if (phoneNumber) {
        await sendActivitySMS(phoneNumber, activity);
      }
    });

    return () => subscription.remove();
  }, []);

  // Save user's phone number
  const savePhoneNumber = async (phoneNumber: string) => {
    try {
      await AsyncStorage.setItem('userPhoneNumber', phoneNumber);
      return true;
    } catch (err) {
      console.error('Error saving phone number', err);
      return false;
    }
  };

  // Manual trigger for testing
  const testSendSMS = async (phoneNumber: string, dayName: string, activityIndex: number) => {
    if (!schedule || !schedule[dayName.toLowerCase()]) {
      setError(`No schedule found for ${dayName}`);
      return false;
    }

    const activity = schedule[dayName.toLowerCase()][activityIndex];
    if (!activity) {
      setError('Activity not found');
      return false;
    }

    return await sendActivitySMS(phoneNumber, activity);
  };

  // Return values and functions
  return {
    schedule,
    isLoading,
    error,
    savePhoneNumber,
    testSendSMS,
    sendActivitySMS
  };
}