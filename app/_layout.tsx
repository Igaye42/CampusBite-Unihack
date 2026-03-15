import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

function RootLayoutNav() {
  const { user, studentData, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login' as any);
    } else if (user) {
      // If user logs in but data indicates preferences aren't set, route to preferences
      const needsPreferences = studentData && studentData.preferencesSet === false;
      
      if (needsPreferences && (segments[0] as string) !== 'preferences') {
        router.replace('/preferences' as any);
      } else if (!needsPreferences && (segments[0] as string) === 'login') {
        // If preferences are set, and user is on login, move them to tabs
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, studentData, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6F9F4' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences', gestureEnabled: false }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="(tabs)" options={{ title: 'Feed' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}