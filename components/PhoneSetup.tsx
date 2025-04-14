// PhoneSetup.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSMSScheduler } from './SMSScheduler';

export default function PhoneSetup() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const { savePhoneNumber, testSendSMS } = useSMSScheduler();

  // Load saved phone number on component mount
  useEffect(() => {
    async function loadSavedNumber() {
      try {
        const savedNumber = await AsyncStorage.getItem('userPhoneNumber');
        if (savedNumber) {
          setPhoneNumber(savedNumber);
          setIsSaved(true);
        }
      } catch (err) {
        console.error('Error loading saved phone number', err);
      }
    }

    loadSavedNumber();
  }, []);

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    const success = await savePhoneNumber(phoneNumber);
    if (success) {
      setIsSaved(true);
      Alert.alert('Success', 'Phone number saved successfully!');
    } else {
      Alert.alert('Error', 'Failed to save phone number');
    }
  };

  const handleTest = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    // Get current day
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    
    // Send test SMS for the first activity of today
    const success = await testSendSMS(phoneNumber, today, 0);
    
    if (success) {
      Alert.alert('Success', 'Test SMS sent successfully!');
    } else {
      Alert.alert('Error', 'Failed to send test SMS');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Notification Setup</Text>
      <Text style={styles.description}>
        Enter your phone number to receive SMS notifications for your scheduled activities.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Save Number" 
          onPress={handleSave} 
        />
        
        {isSaved && (
          <Button 
            title="Send Test SMS" 
            onPress={handleTest} 
          />
        )}
      </View>
      
      {isSaved && (
        <Text style={styles.successText}>
          Your notifications are set up! You will receive SMS reminders for your scheduled activities.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  successText: {
    color: 'green',
    marginTop: 10,
  }
});