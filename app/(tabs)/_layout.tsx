import { Tabs } from 'expo-router';
import { Home, Calendar, Settings } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: isDark ? '#1a1b1e' : '#ffffff',
        borderTopColor: isDark ? '#2c2d31' : '#e5e5e5',
        height: 80,
        paddingBottom: 20,
      },
      tabBarActiveTintColor: isDark ? '#6366f1' : '#4f46e5',
      tabBarInactiveTintColor: isDark ? '#71717a' : '#9ca3af',
      headerStyle: {
        backgroundColor: isDark ? '#1a1b1e' : '#ffffff',
      },
      headerTintColor: isDark ? '#fff' : '#000',
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}