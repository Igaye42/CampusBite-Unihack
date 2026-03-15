import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { logoutStudent, updateStudentAvatar } from '../../services/firebase';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

export default function AccountScreen() {
  const { user, studentData, loading } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logoutStudent();
              router.replace('/login' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to log out.');
            }
          } 
        }
      ]
    );
  };

  const handleChangeAvatar = async () => {
    if (!user) return;
    
    // Request permission to access the camera roll
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // We will use base64 for simplicity in place of Storage
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Avatar = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateStudentAvatar(user.uid, base64Avatar);
      } catch (error) {
        Alert.alert("Error", "Could not update avatar.");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const dietaryTags = studentData?.preferences?.dietary_tags || [];
  const allergies = studentData?.preferences?.allergies || [];
  const categories = studentData?.preferences?.favorite_categories || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Pressable onPress={handleChangeAvatar} style={styles.avatarWrap}>
          {studentData?.avatarUrl ? (
            <Image 
              source={{ uri: studentData.avatarUrl }} 
              style={styles.avatarImage} 
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {studentData?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={12} color="#fff" />
          </View>
        </Pressable>
        <Text style={styles.name}>{studentData?.displayName || 'Student'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{studentData?.posts || 0}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={styles.statNumber}>{studentData?.claims || 0}</Text>
          <Text style={styles.statLabel}>Claims</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Dietary Profile</Text>
        </View>
        
        <Pressable 
          style={styles.preferencesCard} 
          onPress={() => router.push('/preferences')}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.prefLabel}>Diet</Text>
            <Ionicons name="pencil-outline" size={16} color="#B0BEB4" />
          </View>
          {dietaryTags.length > 0 ? (
            <View style={styles.chipContainer}>
              {dietaryTags.map((tag: string) => (
                <View key={tag} style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Tap to specify</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.cardHeaderRow}>
            <Text style={styles.prefLabel}>Allergies to Avoid</Text>
            <Ionicons name="pencil-outline" size={16} color="#B0BEB4" />
          </View>
          {allergies.length > 0 ? (
            <View style={styles.chipContainer}>
              {allergies.map((allergy: string) => (
                <View key={allergy} style={[styles.chip, styles.allergyChip]}><Text style={[styles.chipText, styles.allergyChipText]}>{allergy}</Text></View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Tap to specify</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.cardHeaderRow}>
            <Text style={styles.prefLabel}>Favorite Categories</Text>
            <Ionicons name="pencil-outline" size={16} color="#B0BEB4" />
          </View>
          {categories.length > 0 ? (
            <View style={styles.chipContainer}>
              {categories.map((cat: string) => (
                <View key={cat} style={styles.chip}><Text style={styles.chipText}>{cat}</Text></View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Tap to specify</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="person-outline" size={22} color="#1B4332" />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </Pressable>
        
        <Pressable style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
          <Text style={[styles.menuText, { color: '#D32F2F' }]}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={styles.versionText}>CampusBite v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9F4',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7E0',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1B4332',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B4332',
  },
  email: {
    fontSize: 14,
    color: '#5C6F65',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7E0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#E0E7E0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#5C6F65',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C6F65',
    textTransform: 'uppercase',
  },
  preferencesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7E0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#F1F8F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  allergyChip: {
    backgroundColor: '#FFEAEA',
  },
  allergyChipText: {
    color: '#D32F2F',
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E7E0',
    marginVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E7E0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4332',
    marginLeft: 12,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 32,
  },
});
