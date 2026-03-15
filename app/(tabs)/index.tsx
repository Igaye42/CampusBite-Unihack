import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { getAvailableListings, subscribeToAvailableListings } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Updated to match the new exact schema options
const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'];

function getFoodEmoji(foodTitle: string, category: string) {
  const combined = `${foodTitle} ${category}`.toLowerCase();
  if (combined.includes('pizza')) return '🍕';
  if (combined.includes('pastries') || combined.includes('cake') || combined.includes('muffin')) return '🥐';
  if (combined.includes('sandwich') || combined.includes('burger')) return '🥪';
  if (combined.includes('salad')) return '🥗';
  if (combined.includes('drink') || combined.includes('coffee')) return '🥤';
  if (combined.includes('rice') || combined.includes('noodle') || combined.includes('sushi')) return '🍱';
  return '🍽️';
}

function getUrgencyColor(minutesLeft: number) {
  if (minutesLeft <= 15) return '#D32F2F';
  if (minutesLeft <= 30) return '#F57C00';
  return '#2E7D32';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchDietary, setMatchDietary] = useState(true);
  const { studentData } = useAuth();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // UI State for filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAvailableListings((data: any[]) => {
      const formattedListings = data.map((item: any) => {
        let pickupByTime = 'N/A';

        if (item.pickup_deadline) {
          const deadline = new Date(item.pickup_deadline);
          pickupByTime = deadline.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        }

return {
  id: item.id,
  food_title: item.food_title || "Food Item",
  category: item.category || "other",
  quantity: item.estimated_qty || "Some",
  weight: item.estimated_weight_kg || 0.35,
  safety_risk: item.safety_risk || false,
  location: item.locationName || item.location || "Unknown Location",
  locationDetails: item.locationDetails || "",
  latitude: item.latitude || null,
  longitude: item.longitude || null,
  pickup_deadline: item.pickup_deadline || null,
  dietary_tags: item.dietary_tags || item.tags || [],
  allergen_warnings: item.allergen_warnings || [],
  pickupBy: pickupByTime,
  uploaderId: item.uploaderId,
  uploaderName: item.uploaderName || "Anonymous",
  uploaderAvatar: item.uploaderAvatar || null,
  imageBase64: item.imageBase64 || null,
};
      });

      setListings(formattedListings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // update every minute

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getAvailableListings();
    } catch (error) {
      console.error('Error on refresh: ', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Frontend fallback filtering: Remove expired items, apply search text, apply tag filter
  const processedListings = listings
    .map((item) => {
      let minutesLeft = 0;

      if (item.pickup_deadline) {
        const deadlineMs = new Date(item.pickup_deadline).getTime();
        const diffMs = deadlineMs - currentTime;
        minutesLeft = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      }

      return {
        ...item,
        minutesLeft,
      };
    })
    .filter((item) => {
      // 1. Expiry filter
      if (item.minutesLeft <= 0) return false;

      // 2. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.food_title.toLowerCase().includes(query);
        const matchLocation = item.location.toLowerCase().includes(query);
        if (!matchTitle && !matchLocation) return false;
      }

      // 3. Dietary tag & Safety Override filter
      if (selectedTag) {
        const hasDietaryTag = item.dietary_tags && item.dietary_tags.includes(selectedTag);
        const warnings = item.allergen_warnings || [];
        let hasAllergenConflict = false;

        // Strict Safety Overrides: If user wants X-free, actively block if warning contains X
        if (selectedTag === 'Nut-Free' && (warnings.includes('Contains Nuts') || warnings.includes('Contains Peanuts'))) {
          hasAllergenConflict = true;
        }
        if (selectedTag === 'Dairy-Free' && warnings.includes('Contains Dairy')) {
          hasAllergenConflict = true;
        }
        if (selectedTag === 'Seafood-Free' && warnings.includes('Contains Seafood')) {
          hasAllergenConflict = true;
        }
        if (selectedTag === 'Vegan' && (warnings.includes('Contains Dairy') || warnings.includes('Contains Eggs') || warnings.includes('Contains Seafood'))) {
          hasAllergenConflict = true;
        }

        // Hide if there's a danger conflict OR if it simply doesn't have the tag they are looking for
        if (hasAllergenConflict || !hasDietaryTag) {
          return false;
        }
      }

      // 4. Automatic Dietary Profile Matching
      if (matchDietary && studentData?.preferences) {
        const userDiets = studentData.preferences.dietary_tags || [];
        const userAllergies = studentData.preferences.allergies || [];
        const itemDiets = item.dietary_tags || [];
        const itemWarnings = item.allergen_warnings || [];

        // If user has any specific dietary requirements (e.g. Vegetarian), item must have at least one of them
        if (userDiets.length > 0) {
          const hasMatchingDiet = userDiets.some((diet: string) => itemDiets.includes(diet));
          if (!hasMatchingDiet) return false;
        }

        // If user has allergies, block any item that has a warning for those allergens
        if (userAllergies.length > 0) {
          const hasAllergyConflict = userAllergies.some((allergy: string) => {
            // Map common allergies to warning strings
            const warningMap: Record<string, string[]> = {
              'Nuts': ['Contains Nuts', 'Contains Peanuts'],
              'Dairy': ['Contains Dairy'],
              'Seafood': ['Contains Seafood'],
              'Eggs': ['Contains Eggs'],
              'Gluten': ['Contains Gluten'],
              'Soy': ['Contains Soy']
            };
            const relevantWarnings = warningMap[allergy] || [`Contains ${allergy}`];
            return relevantWarnings.some(w => itemWarnings.includes(w));
          });
          if (hasAllergyConflict) return false;
        }
      }

      return true;
    });

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Food Feed</Text>

      {/* Search Bar UI */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search food or location..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Pressable 
        style={[styles.dietaryToggle, matchDietary && styles.dietaryToggleActive]}
        onPress={() => setMatchDietary(!matchDietary)}
      >
        <Ionicons 
          name={matchDietary ? "checkbox" : "square-outline"} 
          size={20} 
          color={matchDietary ? "#fff" : "#2E7D32"} 
        />
        <Text style={[styles.dietaryToggleText, matchDietary && styles.dietaryToggleTextActive]}>
          Match my Dietary Profile
        </Text>
      </Pressable>

      {/* Dietary Filter Pills UI */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DIETARY_TAGS.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.filterPill, selectedTag === tag && styles.filterPillSelected]}
              onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              <Text style={[styles.filterPillText, selectedTag === tag && styles.filterPillTextSelected]}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={processedListings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No food matches your criteria.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* NEW: Food Image Section */}
            <View style={styles.imageContainer}>
              {item.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
                  style={styles.foodImage}
                />
              ) : (
                <View style={[styles.foodImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderEmoji}>
                    {getFoodEmoji(item.food_title, item.category)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.topRow}>
              <Text style={styles.title}>{item.food_title}</Text>
              <Text
                style={[
                  styles.timeBadge,
                  { color: getUrgencyColor(item.minutesLeft), borderColor: getUrgencyColor(item.minutesLeft) },
                ]}
              >
                {item.minutesLeft} min left
              </Text>
            </View>

            {/* NEW: Uploader Info Row */}
            <View style={styles.uploaderRow}>
              {item.uploaderAvatar ? (
                <Image source={{ uri: item.uploaderAvatar }} style={styles.uploaderAvatar} />
              ) : (
                <View style={styles.uploaderAvatarPlaceholder}>
                  <Text style={styles.uploaderAvatarText}>
                    {item.uploaderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.uploaderName}>Posted by {item.uploaderName}</Text>
            </View>

<Text style={styles.categoryTag}>Category: {item.category}</Text>
<Text style={styles.detail}>📍 {item.location}</Text>
{item.locationDetails ? (
  <Text style={styles.detail}>🏢 {item.locationDetails}</Text>
) : null}
<Text style={styles.detail}>📦 {item.quantity} items (~{item.weight}kg)</Text>
<Text style={styles.detail}>⏰ Pickup by {item.pickupBy}</Text>

            {item.safety_risk && (
              <Text style={styles.safetyRiskText}>⚠️ High Safety Risk (Needs Refrigerator)</Text>
            )}

            {/* NEW: Dietary Tags (Green) */}
            <View style={styles.tagsRow}>
              {item.dietary_tags && item.dietary_tags.length > 0 ? (
                item.dietary_tags.map((tag: string, index: number) => (
                  <View key={`diet-${index}`} style={styles.dietaryPill}>
                    <Text style={styles.dietaryText}>🌱 {tag}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tagPillNeutral}>
                  <Text style={styles.tagTextNeutral}>No specific diet</Text>
                </View>
              )}
            </View>

            {/* NEW: Allergen Warnings (Red) */}
            {item.allergen_warnings && item.allergen_warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Contains:</Text>
                <View style={styles.tagsRow}>
                  {item.allergen_warnings.map((warning: string, index: number) => (
                    <View key={`warn-${index}`} style={styles.warningPill}>
                      <Text style={styles.warningText}>{warning}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {item.uploaderId === user?.uid ? (
              <View style={[styles.button, styles.disabledButton]}>
                <View style={styles.buttonRow}>
                  <Ionicons name="ban" size={20} color="#9E9E9E" />
                  <Text style={[styles.buttonText, styles.disabledButtonText]}> Your Listing</Text>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.button}
                onPress={() =>
                  router.push({
                    pathname: '/claim',
                    params: {
                      id: item.id,
                      food_title: item.food_title,
                      qty: String(item.quantity),
                      location: item.location,
                      locationDetails: item.locationDetails || "",
                      latitude: item.latitude ? String(item.latitude) : "",
                      longitude: item.longitude ? String(item.longitude) : "",
                      safety_risk: String(item.safety_risk),
                      uploaderName: item.uploaderName,
                      uploaderAvatar: item.uploaderAvatar || ""
                    },
                  })
                }
              >
                <Text style={styles.buttonText}>Claim</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9F4', paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: '#1B4332', marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E7E0', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 8 },
  dietaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  dietaryToggleActive: {
    backgroundColor: '#2E7D32',
  },
  dietaryToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  dietaryToggleTextActive: {
    color: '#fff',
  },
  filterContainer: { marginBottom: 16 },
  filterPill: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE5DB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterPillSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  filterPillText: { color: '#555', fontSize: 13, fontWeight: '600' },
  filterPillTextSelected: { color: '#2E7D32', fontWeight: '700' },
  listContent: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E0E7E0' },
  imageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#F1F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 50,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  uploaderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  uploaderAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploaderAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  uploaderName: {
    fontSize: 14,
    color: '#5C6F65',
    fontWeight: '600',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#222', flex: 1 },
  timeBadge: { fontSize: 12, fontWeight: '700', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  categoryTag: { fontSize: 13, color: '#2E7D32', fontWeight: '600', marginBottom: 8 },
  detail: { fontSize: 15, color: '#4F4F4F', marginBottom: 5 },
  safetyRiskText: { color: '#D32F2F', fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 8, gap: 8 },
  
  // New Dietary Styles
  dietaryPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  dietaryText: { color: '#2E7D32', fontSize: 12, fontWeight: '700' },
  tagPillNeutral: { backgroundColor: '#ECEFF1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagTextNeutral: { color: '#607D8B', fontSize: 12, fontWeight: '700' },

  // New Warning Styles
  warningBox: { backgroundColor: '#FFEBEE', padding: 10, borderRadius: 8, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#FFCDD2' },
  warningTitle: { color: '#C62828', fontWeight: '800', fontSize: 13, marginBottom: 6 },
  warningPill: { backgroundColor: '#C62828', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  warningText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  button: { backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  disabledButton: { backgroundColor: '#E0E0E0' },
  disabledButtonText: { color: '#9E9E9E' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#5C6F65' },
});