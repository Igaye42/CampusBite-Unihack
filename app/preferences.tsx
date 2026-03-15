import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Alert, 
  ActivityIndicator, ScrollView, SafeAreaView 
} from 'react-native';
import { updateStudentPreferences } from '../services/firebase';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Halal", "Gluten-Free", "Dairy-Free"];
const ALLERGY_OPTIONS = ["Peanuts", "Nuts", "Seafood", "Dairy", "Eggs"];
const CATEGORY_OPTIONS = ["meal", "snack", "dessert", "drink", "groceries"];

export default function PreferencesScreen() {
  const { user, studentData } = useAuth();
  const [loading, setLoading] = useState(false);

  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Prepopulate if editing
  useEffect(() => {
    if (studentData?.preferences) {
      setSelectedDiet(studentData.preferences.dietary_tags || []);
      setSelectedAllergies(studentData.preferences.allergies || []);
      setSelectedCategories(studentData.preferences.favorite_categories || []);
    }
  }, [studentData]);

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const preferencesData = {
        dietaryTags: selectedDiet,
        allergies: selectedAllergies,
        categories: selectedCategories
      };

      await updateStudentPreferences(user.uid, preferencesData);
      
      if (studentData?.preferencesSet && router.canGoBack()) {
        // If already set and we have history (editing), go back
        router.back();
      } else {
        // Otherwise (signup or refreshed root), go to tabs
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (options: string[], selected: string[], toggleFn: any) => (
    <View style={styles.chipContainer}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => toggleFn(option)}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>Customize Your Experience</Text>
          <Text style={styles.subtitle}>Help us tailor food listings to your needs.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Set Your Preferences</Text>
          
          <Text style={styles.label}>Dietary Requirements</Text>
          {renderChips(DIETARY_OPTIONS, selectedDiet, (val: string) => toggleSelection(val, selectedDiet, setSelectedDiet))}

          <Text style={styles.label}>Allergies to Avoid</Text>
          {renderChips(ALLERGY_OPTIONS, selectedAllergies, (val: string) => toggleSelection(val, selectedAllergies, setSelectedAllergies))}

          <Text style={styles.label}>Favorite Categories</Text>
          {renderChips(CATEGORY_OPTIONS, selectedCategories, (val: string) => toggleSelection(val, selectedCategories, setSelectedCategories))}

          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSavePreferences}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {studentData?.preferencesSet ? 'Save Changes' : 'Save & Continue'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9F4',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 10,
  },
  chipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20',
  },
  chipText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
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
});
