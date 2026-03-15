import { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, Pressable, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView 
} from 'react-native';
import { loginStudent, registerStudent } from '../services/firebase';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

// Auth categories removed to preference screen

export default function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Removed preferences state
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        if (!firstName || !lastName) {
          Alert.alert('Error', 'Please provide your first and last name.');
          setLoading(false);
          return;
        }

        const profileData = {
          firstName: firstName.trim(),
          lastName: lastName.trim()
        };

        await registerStudent(email.trim(), password, profileData);
        Alert.alert('Welcome! 🎉', 'Your account has been created.');
      } else {
        await loginStudent(email.trim(), password);
      }
      
      // Navigate to main tabs upon success
      router.replace('/(tabs)');
    } catch (error: any) {
      console.log("Auth error code:", error.code);
      let message = 'An error occurred. Please try again.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already in use by another account.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'The email address format is invalid.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
      Alert.alert('Authentication Failed', message);
    } finally {
      setLoading(false);
    }
  };
  // Render chips moved

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBox}>
            <Text style={styles.title}>CampusBite 🍎</Text>
            <Text style={styles.subtitle}>Reducing Monash food waste, together.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isRegistering ? 'Create Account' : 'Welcome Back'}</Text>
            
            {isRegistering && (
              <View style={styles.row}>
                <View style={[styles.flex1, { marginRight: 8 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor="#6B7280"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    placeholderTextColor="#6B7280"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>
            )}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="student@student.monash.edu"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </Pressable>
            </View>

            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegistering ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </Pressable>

            <Pressable 
              style={styles.switchButton} 
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={styles.switchText}>
                {isRegistering 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9F4',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1B4332',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#386641',
    marginTop: 8,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E0E7E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E0E7E0',
    borderRadius: 12,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 4,
  },
  preferencesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#E0E7E0',
  },
  preferencesHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#F1F8F5',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20',
  },
  chipText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 28,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 10,
  },
  switchText: {
    color: '#386641',
    fontSize: 15,
    fontWeight: '700',
  },
});
