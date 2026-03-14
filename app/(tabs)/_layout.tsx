import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'index') iconName = 'home';
          else if (route.name === 'post') iconName = 'add-circle';
          else if (route.name === 'claim') iconName = 'checkmark-circle';
          else if (route.name === 'impact') iconName = 'leaf';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="post" options={{ title: 'Post' }} />
      <Tabs.Screen name="claim" options={{ title: 'Claim' }} />
      <Tabs.Screen name="impact" options={{ title: 'Impact' }} />
    </Tabs>
  );
}