// import React, { useState, useEffect } from 'react';
// import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Modal, Alert } from 'react-native';
// import { Feather } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as SMS from 'expo-sms';
// import * as Notifications from 'expo-notifications';

// // Import the SMS scheduler hook (you'll need to create this file)
// import { useSMSScheduler } from '@/components/SMSScheduler';

// export default function SettingsScreen() {
//   const [notificationTiming, setNotificationTiming] = useState('5 min before');
//   const [showTimingOptions, setShowTimingOptions] = useState(false);
//   const [whatsappNumber, setWhatsappNumber] = useState('');
//   const [exportFormat, setExportFormat] = useState('PDF');
//   const [showExportOptions, setShowExportOptions] = useState(false);
//   const [smsEnabled, setSmsEnabled] = useState(false);
//   const [isSmsAvailable, setIsSmsAvailable] = useState(false);

//   // Get functions from the SMS scheduler hook
//   const { savePhoneNumber, testSendSMS } = useSMSScheduler();

//   const timingOptions = ['1 min before', '5 min before', '10 min before'];
//   const exportOptions = ['PDF', 'JSON'];

//   // Check if SMS is available on the device
//   useEffect(() => {
//     async function checkSmsAvailability() {
//       try {
//         const isAvailable = await SMS.isAvailableAsync();
//         setIsSmsAvailable(isAvailable);
        
//         // Load saved number if it exists
//         const savedNumber = await AsyncStorage.getItem('userPhoneNumber');
//         if (savedNumber) {
//           setWhatsappNumber(savedNumber);
//           setSmsEnabled(true);
//         }
//       } catch (error) {
//         console.error('Error checking SMS availability:', error);
//       }
//     }
    
//     checkSmsAvailability();
    
//     // Request notification permissions
//     async function requestPermissions() {
//       const { status } = await Notifications.requestPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Notification permission', 'Notifications are required for SMS reminders to work properly');
//       }
//     }
    
//     requestPermissions();
//   }, []);

//   // Save settings
//   const handleSaveSettings = async () => {
//     if (smsEnabled && (!whatsappNumber || whatsappNumber.length < 10)) {
//       Alert.alert('Invalid Number', 'Please enter a valid phone number for SMS notifications');
//       return;
//     }

//     // Save notification timing preference
//     await AsyncStorage.setItem('notificationTiming', notificationTiming);
    
//     // Save export format preference
//     await AsyncStorage.setItem('exportFormat', exportFormat);
    
//     // Save phone number for SMS if enabled
//     if (smsEnabled) {
//       await savePhoneNumber(whatsappNumber);
//       Alert.alert('Success', 'Settings saved successfully. SMS notifications are enabled.');
//     } else {
//       // Clear the phone number if SMS is disabled
//       await AsyncStorage.removeItem('userPhoneNumber');
//       Alert.alert('Success', 'Settings saved successfully. SMS notifications are disabled.');
//     }
//   };

//   // Send a test SMS
//   const handleTestSms = async () => {
//     if (!whatsappNumber || whatsappNumber.length < 10) {
//       Alert.alert('Invalid Number', 'Please enter a valid phone number');
//       return;
//     }

//     // Get current day
//     const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
//     const today = days[new Date().getDay()];
    
//     // Send test SMS for the first activity of today
//     const success = await testSendSMS(whatsappNumber, today, 0);
    
//     if (success) {
//       Alert.alert('Success', 'Test SMS sent successfully!');
//     } else {
//       Alert.alert('Error', 'Failed to send test SMS');
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <StatusBar barStyle="dark-content" />
      
//       {/* Header */}
//       <View className="px-6 pt-6 pb-6 mt-10">
//         <Text className="text-4xl font-bold text-gray-800">
//           Settings
//         </Text>
//       </View>
      
//       {/* Settings List */}
//       <ScrollView className="flex-1 px-6">
//         {/* Notification Timing */}
//         <View className="mb-6">
//           <Text className="text-lg font-medium text-gray-800 mb-2">
//             Notification timing
//           </Text>
//           <TouchableOpacity 
//             className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
//             onPress={() => setShowTimingOptions(true)}
//           >
//             <Text className="text-gray-700">{notificationTiming}</Text>
//             <Feather name="chevron-down" size={20} color="#666" />
//           </TouchableOpacity>
          
//           {/* Timing options modal */}
//           <Modal
//             visible={showTimingOptions}
//             transparent={true}
//             animationType="fade"
//             onRequestClose={() => setShowTimingOptions(false)}
//           >
//             <TouchableOpacity 
//               className="flex-1 justify-center items-center bg-black/50"
//               activeOpacity={1} 
//               onPress={() => setShowTimingOptions(false)}
//             >
//               <View className="bg-white rounded-xl w-4/5 overflow-hidden">
//                 <Text className="text-center text-lg font-medium p-4 border-b border-gray-200">
//                   Select notification timing
//                 </Text>
//                 {timingOptions.map((option, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     className={`p-4 ${index < timingOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
//                     onPress={() => {
//                       setNotificationTiming(option);
//                       setShowTimingOptions(false);
//                     }}
//                   >
//                     <Text className={`text-center ${notificationTiming === option ? 'text-blue-500 font-medium' : 'text-gray-800'}`}>
//                       {option}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableOpacity>
//           </Modal>
//         </View>
        
//         <View className="h-px bg-gray-200 my-4" />
        
//         {/* SMS Notifications Toggle */}
//         <View className="mb-6">
//           <Text className="text-lg font-medium text-gray-800 mb-2">
//             SMS Notifications
//           </Text>
//           <TouchableOpacity 
//             className={`p-4 rounded-lg flex-row justify-between items-center ${smsEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}
//             onPress={() => setSmsEnabled(!smsEnabled)}
//             disabled={!isSmsAvailable}
//           >
//             <Text className={`${smsEnabled ? 'text-blue-700' : 'text-gray-700'}`}>
//               {smsEnabled ? 'Enabled' : 'Disabled'}
//             </Text>
//             <View className={`w-10 h-6 rounded-full ${smsEnabled ? 'bg-blue-500' : 'bg-gray-400'} justify-center`}>
//               <View className={`w-4 h-4 rounded-full bg-white ${smsEnabled ? 'ml-5' : 'ml-1'}`} />
//             </View>
//           </TouchableOpacity>
//           {!isSmsAvailable && (
//             <Text className="text-red-500 text-xs mt-2">
//               SMS functionality is not available on this device
//             </Text>
//           )}
//         </View>
        
//         <View className="h-px bg-gray-200 my-4" />
        
//         {/* Sync Options */}
//         <View className="mb-6">
//           <Text className="text-lg font-medium text-gray-800 mb-2">
//             Sync Options
//           </Text>
//           <TouchableOpacity 
//             className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
//             onPress={() => setShowExportOptions(true)}
//           >
//             <Text className="text-gray-700">Export as {exportFormat}</Text>
//             <Feather name="chevron-down" size={20} color="#666" />
//           </TouchableOpacity>
          
//           {/* Export options modal */}
//           <Modal
//             visible={showExportOptions}
//             transparent={true}
//             animationType="fade"
//             onRequestClose={() => setShowExportOptions(false)}
//           >
//             <TouchableOpacity 
//               className="flex-1 justify-center items-center bg-black/50"
//               activeOpacity={1} 
//               onPress={() => setShowExportOptions(false)}
//             >
//               <View className="bg-white rounded-xl w-4/5 overflow-hidden">
//                 <Text className="text-center text-lg font-medium p-4 border-b border-gray-200">
//                   Select export format
//                 </Text>
//                 {exportOptions.map((option, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     className={`p-4 ${index < exportOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
//                     onPress={() => {
//                       setExportFormat(option);
//                       setShowExportOptions(false);
//                     }}
//                   >
//                     <Text className={`text-center ${exportFormat === option ? 'text-blue-500 font-medium' : 'text-gray-800'}`}>
//                       {option}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableOpacity>
//           </Modal>
//         </View>
        
//         <View className="h-px bg-gray-200 my-4" />
        
//         {/* WhatsApp/SMS Number */}
//         <View className="mb-6">
//           <Text className="text-lg font-medium text-gray-800 mb-2">
//             SMS Number
//           </Text>
//           <View className={`p-4 rounded-lg ${smsEnabled ? 'bg-white border border-blue-200' : 'bg-gray-100'}`}>
//             <TextInput
//               className={`${smsEnabled ? 'text-gray-800' : 'text-gray-400'}`}
//               placeholder="Enter phone number for SMS"
//               value={whatsappNumber}
//               onChangeText={setWhatsappNumber}
//               keyboardType="phone-pad"
//               editable={smsEnabled}
//             />
//             <Text className="text-xs text-gray-500 mt-2">
//               Schedule notifications will be sent to this number via SMS
//             </Text>
//           </View>
//         </View>
        
//         {/* Test SMS Button (visible only when SMS is enabled) */}
//         {smsEnabled && isSmsAvailable && whatsappNumber.length >= 10 && (
//           <TouchableOpacity 
//             className="bg-blue-500 py-3 rounded-lg mb-6"
//             onPress={handleTestSms}
//           >
//             <Text className="text-white text-center font-medium">Send Test SMS</Text>
//           </TouchableOpacity>
//         )}
        
//         {/* Action Button */}
//         <TouchableOpacity 
//           className="bg-gray-800 py-4 rounded-lg mb-8"
//           onPress={handleSaveSettings}
//         >
//           <Text className="text-white text-center font-medium">Save Settings</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import * as Notifications from 'expo-notifications';

// Import the SMS scheduler hook
import { useSMSScheduler } from '@/components/SMSScheduler';

export default function SettingsScreen() {
  const [notificationTiming, setNotificationTiming] = useState('5 min before');
  const [showTimingOptions, setShowTimingOptions] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Get functions from the SMS scheduler hook
  const { 
    savePhoneNumber, 
    testSendSMS, 
    smsIsAvailable, 
    clearSMSSettings,
    scheduleNotifications
  } = useSMSScheduler();

  const timingOptions = ['1 min before', '5 min before', '10 min before'];
  const exportOptions = ['PDF', 'JSON'];

  // Load saved settings
  useEffect(() => {
    async function loadSettings() {
      try {
        // Load notification timing
        const savedTiming = await AsyncStorage.getItem('notificationTiming');
        if (savedTiming) {
          setNotificationTiming(savedTiming);
        }
        
        // Load export format
        const savedFormat = await AsyncStorage.getItem('exportFormat');
        if (savedFormat) {
          setExportFormat(savedFormat);
        }
        
        // Load SMS settings
        const savedNumber = await AsyncStorage.getItem('userPhoneNumber');
        if (savedNumber) {
          setPhoneNumber(savedNumber);
        }
        
        const savedSmsEnabled = await AsyncStorage.getItem('smsEnabled') === 'true';
        setSmsEnabled(savedSmsEnabled);
        
        // Request notification permissions if SMS is enabled
        if (savedSmsEnabled) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Notification permission', 
              'Notifications are required for SMS reminders to work properly'
            );
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    
    loadSettings();
  }, []);

  // Handle SMS toggle
  const handleSmsToggle = async () => {
    if (!smsIsAvailable && !smsEnabled) {
      Alert.alert('SMS Not Available', 'SMS functionality is not available on this device');
      return;
    }
    
    setSmsEnabled(!smsEnabled);
    
    // If turning off SMS, clear settings
    if (smsEnabled) {
      await clearSMSSettings();
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      // Validate phone number if SMS is enabled
      if (smsEnabled) {
        if (!phoneNumber || phoneNumber.length < 10) {
          Alert.alert('Invalid Number', 'Please enter a valid phone number for SMS notifications');
          return;
        }
      }

      // Save notification timing preference
      await AsyncStorage.setItem('notificationTiming', notificationTiming);
      
      // Save export format preference
      await AsyncStorage.setItem('exportFormat', exportFormat);
      
      // Save SMS settings
      await AsyncStorage.setItem('smsEnabled', smsEnabled ? 'true' : 'false');
      
      if (smsEnabled) {
        // Save phone number and schedule notifications
        await savePhoneNumber(phoneNumber);
        const scheduled = await scheduleNotifications();
        
        if (scheduled) {
          Alert.alert('Success', 'Settings saved successfully. SMS notifications are enabled.');
        } else {
          Alert.alert('Success', 'Settings saved, but no notifications were scheduled for today.');
        }
      } else {
        // Clear SMS settings
        await clearSMSSettings();
        Alert.alert('Success', 'Settings saved successfully. SMS notifications are disabled.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  // Send a test SMS
  const handleTestSms = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    if (!smsIsAvailable) {
      Alert.alert('SMS Not Available', 'SMS functionality is not available on this device');
      return;
    }

    // Get current day
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    
    // Show loading
    Alert.alert('Sending Test SMS', 'Please wait...');
    
    // Send test SMS for the first activity of today
    const success = await testSendSMS(phoneNumber, today, 0);
    
    if (success) {
      Alert.alert('Success', 'Test SMS sent successfully!');
    } else {
      Alert.alert('Error', 'Failed to send test SMS. Please check your device settings.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 pt-6 pb-6 mt-10">
        <Text className="text-4xl font-bold text-gray-800">
          Settings
        </Text>
      </View>
      
      {/* Settings List */}
      <ScrollView className="flex-1 px-6">
        {/* Notification Timing */}
        <View className="mb-6">
          <Text className="text-lg font-medium text-gray-800 mb-2">
            Notification timing
          </Text>
          <TouchableOpacity 
            className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
            onPress={() => setShowTimingOptions(true)}
          >
            <Text className="text-gray-700">{notificationTiming}</Text>
            <Feather name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* Timing options modal */}
          <Modal
            visible={showTimingOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowTimingOptions(false)}
          >
            <TouchableOpacity 
              className="flex-1 justify-center items-center bg-black/50"
              activeOpacity={1} 
              onPress={() => setShowTimingOptions(false)}
            >
              <View className="bg-white rounded-xl w-4/5 overflow-hidden">
                <Text className="text-center text-lg font-medium p-4 border-b border-gray-200">
                  Select notification timing
                </Text>
                {timingOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`p-4 ${index < timingOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onPress={() => {
                      setNotificationTiming(option);
                      setShowTimingOptions(false);
                    }}
                  >
                    <Text className={`text-center ${notificationTiming === option ? 'text-blue-500 font-medium' : 'text-gray-800'}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
        
        <View className="h-px bg-gray-200 my-4" />
        
        {/* SMS Notifications Toggle */}
        <View className="mb-6">
          <Text className="text-lg font-medium text-gray-800 mb-2">
            SMS Notifications
          </Text>
          <TouchableOpacity 
            className={`p-4 rounded-lg flex-row justify-between items-center ${smsEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}
            onPress={handleSmsToggle}
            disabled={!smsIsAvailable && !smsEnabled}
          >
            <Text className={`${smsEnabled ? 'text-blue-700' : 'text-gray-700'}`}>
              {smsEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <View className={`w-10 h-6 rounded-full ${smsEnabled ? 'bg-blue-500' : 'bg-gray-400'} justify-center`}>
              <View className={`w-4 h-4 rounded-full bg-white ${smsEnabled ? 'ml-5' : 'ml-1'}`} />
            </View>
          </TouchableOpacity>
          {!smsIsAvailable && (
            <Text className="text-red-500 text-xs mt-2">
              SMS functionality is not available on this device
            </Text>
          )}
        </View>
        
        <View className="h-px bg-gray-200 my-4" />
        
        {/* Sync Options */}
        <View className="mb-6">
          <Text className="text-lg font-medium text-gray-800 mb-2">
            Sync Options
          </Text>
          <TouchableOpacity 
            className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
            onPress={() => setShowExportOptions(true)}
          >
            <Text className="text-gray-700">Export as {exportFormat}</Text>
            <Feather name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* Export options modal */}
          <Modal
            visible={showExportOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowExportOptions(false)}
          >
            <TouchableOpacity 
              className="flex-1 justify-center items-center bg-black/50"
              activeOpacity={1} 
              onPress={() => setShowExportOptions(false)}
            >
              <View className="bg-white rounded-xl w-4/5 overflow-hidden">
                <Text className="text-center text-lg font-medium p-4 border-b border-gray-200">
                  Select export format
                </Text>
                {exportOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`p-4 ${index < exportOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onPress={() => {
                      setExportFormat(option);
                      setShowExportOptions(false);
                    }}
                  >
                    <Text className={`text-center ${exportFormat === option ? 'text-blue-500 font-medium' : 'text-gray-800'}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
        
        <View className="h-px bg-gray-200 my-4" />
        
        {/* SMS Phone Number */}
        <View className="mb-6">
          <Text className="text-lg font-medium text-gray-800 mb-2">
            SMS Number
          </Text>
          <View className={`p-4 rounded-lg ${smsEnabled ? 'bg-white border border-blue-200' : 'bg-gray-100'}`}>
            <TextInput
              className={`${smsEnabled ? 'text-gray-800' : 'text-gray-400'}`}
              placeholder="Enter phone number for SMS"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={smsEnabled}
            />
            <Text className="text-xs text-gray-500 mt-2">
              Scheduled notifications will be sent to this number via SMS
            </Text>
          </View>
        </View>
        
        {/* Test SMS Button (visible only when SMS is enabled) */}
        {smsEnabled && smsIsAvailable && phoneNumber.length >= 10 && (
          <TouchableOpacity 
            className="bg-blue-500 py-3 rounded-lg mb-6"
            onPress={handleTestSms}
          >
            <Text className="text-white text-center font-medium">Send Test SMS</Text>
          </TouchableOpacity>
        )}
        
        {/* Action Button */}
        <TouchableOpacity 
          className="bg-gray-800 py-4 rounded-lg mb-8"
          onPress={handleSaveSettings}
        >
          <Text className="text-white text-center font-medium">Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}