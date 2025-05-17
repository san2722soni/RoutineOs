// // SMSScheduler.tsx
// import { useEffect, useState } from 'react';
// import * as SMS from 'expo-sms';
// import * as Notifications from 'expo-notifications';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // import scheduleData from '@/data/schedule.json';

// interface Activity {
//   time: string;
//   activity: string;
//   isEnabled: boolean;
//   duration: number;
//   category: string;
//   completed: boolean;
// }

// interface ScheduleData {
//   [day: string]: Activity[];
// }

// export function useSMSScheduler() {
//   const [schedule, setSchedule] = useState<ScheduleData | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   // Load schedule data
//   useEffect(() => {
//     async function loadSchedule() {
//       try {
//         const scheduleData = require('@/data/schedule.json');
//         setSchedule(scheduleData);
//         setIsLoading(false);
//       } catch (err) {
//         console.error('Failed to load schedule', err);
//         setError('Failed to load schedule data');
//         setIsLoading(false);
//       }
//     }

//     loadSchedule();
//   }, []);

//   // Check SMS availability
//   useEffect(() => {
//     async function checkSMSAvailable() {
//       const isAvailable = await SMS.isAvailableAsync();
//       if (!isAvailable) {
//         setError('SMS is not available on this device');
//       }
//     }

//     checkSMSAvailable();
//   }, []);

//   // Request notification permissions
//   useEffect(() => {
//     async function requestPermissions() {
//       const { status } = await Notifications.requestPermissionsAsync();
//       if (status !== 'granted') {
//         setError('Notification permissions not granted');
//       }
//     }

//     requestPermissions();
//   }, []);

//   // Schedule notifications for today
//   useEffect(() => {
//     if (!schedule) return;

//     async function scheduleNotificationsForToday() {
//       // Clear any existing notifications
//       await Notifications.cancelAllScheduledNotificationsAsync();

//       const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
//       const today = new Date();
//       const dayName = days[today.getDay()].toLowerCase();

//       if (!schedule[dayName]) return;

//       // Schedule each activity
//       for (const activity of schedule[dayName]) {
//         if (!activity.isEnabled) continue;

//         const [startTime] = activity.time.split(' - ');
//         const [hours, minutes] = startTime.replace(/\s*(AM|PM)\s*$/, '').split(':');
        
//         // Parse time
//         let hour = parseInt(hours);
//         const minute = parseInt(minutes);
        
//         // Handle AM/PM
//         if (startTime.includes('PM') && hour < 12) {
//           hour += 12;
//         } else if (startTime.includes('AM') && hour === 12) {
//           hour = 0;
//         }

//         // Create notification trigger time
//         const triggerDate = new Date();
//         triggerDate.setHours(hour, minute, 0);

//         // Only schedule if time is in the future
//         if (triggerDate > today) {
//           const identifier = await Notifications.scheduleNotificationAsync({
//             content: {
//               title: `Activity: ${activity.activity}`,
//               body: `It's time for your ${activity.category} activity.`,
//               data: { activity },
//             },
//             trigger: triggerDate,
//           });
          
//           console.log(`Scheduled notification for ${activity.activity} at ${triggerDate.toString()}`);
//         }
//       }
//     }

//     scheduleNotificationsForToday();
//   }, [schedule]);

//   // Send SMS function
//   const sendActivitySMS = async (phoneNumber: string, activity: Activity) => {
//     try {
//       const isAvailable = await SMS.isAvailableAsync();
//       if (!isAvailable) {
//         throw new Error('SMS is not available on this device');
//       }

//       const { result } = await SMS.sendSMSAsync(
//         [phoneNumber],
//         `Reminder: It's time for "${activity.activity}"`
//       );

//       if (result === 'sent') {
//         console.log(`SMS sent for activity: ${activity.activity}`);
//         return true;
//       } else {
//         console.log(`SMS failed to send: ${result}`);
//         return false;
//       }
//     } catch (err) {
//       console.error('Error sending SMS', err);
//       return false;
//     }
//   };

//   // Listen for notification responses
//   useEffect(() => {
//     const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
//       const activity = response.notification.request.content.data.activity as Activity;
      
//       // Get saved phone number from storage
//       const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      
//       if (phoneNumber) {
//         await sendActivitySMS(phoneNumber, activity);
//       }
//     });

//     return () => subscription.remove();
//   }, []);

//   // Save user's phone number
//   const savePhoneNumber = async (phoneNumber: string) => {
//     try {
//       await AsyncStorage.setItem('userPhoneNumber', phoneNumber);
//       return true;
//     } catch (err) {
//       console.error('Error saving phone number', err);
//       return false;
//     }
//   };

//   // Manual trigger for testing
//   const testSendSMS = async (phoneNumber: string, dayName: string, activityIndex: number) => {
//     if (!schedule || !schedule[dayName.toLowerCase()]) {
//       setError(`No schedule found for ${dayName}`);
//       return false;
//     }

//     const activity = schedule[dayName.toLowerCase()][activityIndex];
//     if (!activity) {
//       setError('Activity not found');
//       return false;
//     }

//     return await sendActivitySMS(phoneNumber, activity);
//   };

//   // Return values and functions
//   return {
//     schedule,
//     isLoading,
//     error,
//     savePhoneNumber,
//     testSendSMS,
//     sendActivitySMS
//   };
// }

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
  const [smsIsAvailable, setSmsIsAvailable] = useState<boolean>(false);

  // Load schedule data
  useEffect(() => {
    async function loadSchedule() {
      try {
        // Fix: Use dynamic import to properly load JSON
        const scheduleData = require('@/data/schedule.json');
        
        // Sanitize any inappropriate content
        Object.keys(scheduleData).forEach(day => {
          scheduleData[day] = scheduleData[day].map((activity: Activity) => {
            // Clean up any inappropriate activity names
            if (activity.activity.includes("FUCK")) {
              activity.activity = "Personal time";
            }
            return activity;
          });
        });

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
      try {
        const isAvailable = await SMS.isAvailableAsync();
        setSmsIsAvailable(isAvailable);
        if (!isAvailable) {
          setError('SMS is not available on this device');
        }
      } catch (error) {
        console.error('Error checking SMS availability:', error);
        setSmsIsAvailable(false);
      }
    }

    checkSMSAvailable();
  }, []);

  // Request notification permissions
  useEffect(() => {
    async function configureNotifications() {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Notification permissions not granted');
        return;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }

    configureNotifications();
  }, []);

  // Schedule notifications based on user preference
  const scheduleNotifications = async () => {
    if (!schedule) return false;

    try {
      // Clear any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = new Date();
      const dayName = days[today.getDay()].toLowerCase();
      
      // Get notification timing preference
      const notificationTiming = await AsyncStorage.getItem('notificationTiming') || '5 min before';
      const minutesBefore = parseInt(notificationTiming.split(' ')[0]);

      if (!schedule[dayName]) return false;

      let notificationsScheduled = 0;

      // Schedule each activity
      for (const activity of schedule[dayName]) {
        if (!activity.isEnabled) continue;

        // Parse activity time
        const [startTime] = activity.time.split(' - ');
        const timeRegex = /(\d+):(\d+)\s*(AM|PM)/i;
        const match = timeRegex.exec(startTime);
        
        if (!match) continue;
        
        let [_, hoursStr, minutesStr, period] = match;
        
        // Parse time
        let hours = parseInt(hoursStr);
        const minutes = parseInt(minutesStr);
        
        // Handle AM/PM
        if (period.toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }

        // Create notification trigger time (x minutes before activity)
        const triggerDate = new Date();
        triggerDate.setHours(hours, minutes, 0);
        triggerDate.setTime(triggerDate.getTime() - (minutesBefore * 60 * 1000));

        // Only schedule if time is in the future
        if (triggerDate > today) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Upcoming: ${activity.activity}`,
              body: `Your ${activity.category} activity starts in ${minutesBefore} minutes.`,
              data: { activity, notifyTime: triggerDate.toString() },
            },
            trigger: triggerDate,
          });
          
          console.log(`Scheduled notification for ${activity.activity} at ${triggerDate.toString()}`);
          notificationsScheduled++;
        }
      }

      return notificationsScheduled > 0;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return false;
    }
  };

  // Send SMS function
  const sendActivitySMS = async (phoneNumber: string, activity: Activity) => {
    try {
      if (!smsIsAvailable) {
        console.error('SMS is not available on this device');
        return false;
      }

      // Format a user-friendly time from the activity time
      const [startTime, endTime] = activity.time.split(' - ');
      
      const message = `Reminder: Your activity "${activity.activity}" (${activity.category}) starts at ${startTime}`;

      const { result } = await SMS.sendSMSAsync(
        [phoneNumber],
        message
      );

      if (result === 'sent' || result === 'unknown') {
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

  // Listen for notification responses and send SMS
  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      const activity = notification.request.content.data.activity as Activity;
      const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      const smsEnabled = await AsyncStorage.getItem('smsEnabled') === 'true';
      
      // Send SMS if enabled and phone number exists
      if (smsEnabled && phoneNumber && activity) {
        await sendActivitySMS(phoneNumber, activity);
      }
    });

    // Also handle notifications that arrived when app was in background
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const activity = response.notification.request.content.data.activity as Activity;
      const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      const smsEnabled = await AsyncStorage.getItem('smsEnabled') === 'true';
      
      if (smsEnabled && phoneNumber && activity) {
        await sendActivitySMS(phoneNumber, activity);
      }
    });

    return () => {
      foregroundSubscription.remove();
      backgroundSubscription.remove();
    };
  }, []);

  // Save user's phone number
  const savePhoneNumber = async (phoneNumber: string) => {
    try {
      await AsyncStorage.setItem('userPhoneNumber', phoneNumber);
      await AsyncStorage.setItem('smsEnabled', 'true');
      
      // Schedule notifications when phone number is saved
      await scheduleNotifications();
      return true;
    } catch (err) {
      console.error('Error saving phone number', err);
      return false;
    }
  };

  // Clear SMS settings
  const clearSMSSettings = async () => {
    try {
      await AsyncStorage.removeItem('userPhoneNumber');
      await AsyncStorage.setItem('smsEnabled', 'false');
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (err) {
      console.error('Error clearing SMS settings', err);
      return false;
    }
  };

  // Manual trigger for testing
  const testSendSMS = async (phoneNumber: string, dayName: string, activityIndex: number) => {
    if (!smsIsAvailable) {
      console.error('SMS is not available on this device');
      return false;
    }

    if (!schedule || !schedule[dayName.toLowerCase()]) {
      setError(`No schedule found for ${dayName}`);
      return false;
    }

    const activityList = schedule[dayName.toLowerCase()];
    
    if (activityIndex >= activityList.length) {
      activityIndex = 0; // Default to first activity if index is out of bounds
    }
    
    const activity = activityList[activityIndex];
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
    smsIsAvailable,
    savePhoneNumber,
    clearSMSSettings,
    testSendSMS,
    sendActivitySMS,
    scheduleNotifications
  };
}