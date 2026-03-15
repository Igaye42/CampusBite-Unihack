import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, Alert, 
  ActivityIndicator, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { updateStudentProfile } from '../services/firebase';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function EditProfileScreen() {
  const { user, studentData } = useAuth();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (studentData) {
      setFirstName(studentData.firstName || '');
      setLastName(studentData.lastName || '');
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [studentData, user]);

  const handleSaveProfile = async () => {
    if (!user || !studentData) return;
    
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Error', 'Fields cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      await updateStudentProfile(
        user.uid, 
        user.email || '', 
        email.trim(), 
        firstName.trim(), 
        lastName.trim()
      );
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Security Error', 'Changing your email requires a recent login. Please sign out and sign back in to change your email.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Please enter a valid email address.');
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'This email is already registered to another account.');
      } else {
        Alert.alert('Error', 'Could not save your profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1B4332" />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
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

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="youremail@student.monash.edu"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Note: Changing your email may require you to sign in again.
            </Text>

            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F1EB',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B4332',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#757575',
    marginTop: -8,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
