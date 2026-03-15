import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAvailableListings, subscribeToAvailableListings } from '../../services/firebase';

const DIETARY_TAGS = ['vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-warning'];

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
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        food_title: item.food_title || 'Food Item',
        category: item.category || 'other',
        quantity: item.estimated_qty || 'Some',
        weight: item.estimated_weight_kg || 0.35,
        safety_risk: item.safety_risk || false,
        location: item.location || 'Unknown Location',
        pickup_deadline: item.pickup_deadline || null,
        tags: item.tags || [],
        pickupBy: pickupByTime,
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

    // 3. Dietary tag filter
    if (selectedTag) {
      if (!item.tags || !item.tags.includes(selectedTag)) return false;
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
            <View style={styles.topRow}>
              <Text style={styles.title}>
                {getFoodEmoji(item.food_title, item.category)} {item.food_title}
              </Text>
              <Text
                style={[
                  styles.timeBadge,
                  { color: getUrgencyColor(item.minutesLeft), borderColor: getUrgencyColor(item.minutesLeft) },
                ]}
              >
                {item.minutesLeft} min left
              </Text>
            </View>

            <Text style={styles.categoryTag}>Category: {item.category}</Text>
            <Text style={styles.detail}>📍 {item.location}</Text>
            <Text style={styles.detail}>📦 {item.quantity} items (~{item.weight}kg)</Text>
            <Text style={styles.detail}>⏰ Pickup by {item.pickupBy}</Text>

            {item.safety_risk && (
              <Text style={styles.warningText}>⚠️ High Risk (Needs Refrigerator)</Text>
            )}

            <View style={styles.tagsRow}>
              {item.tags && item.tags.length > 0 ? (
                item.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tagPillNeutral}>
                  <Text style={styles.tagTextNeutral}>no dietary tags</Text>
                </View>
              )}
            </View>

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
                    safety_risk: String(item.safety_risk) // Pass safety risk state
                  },
                })
              }
            >
              <Text style={styles.buttonText}>Claim</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9F4', paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: '#1B4332', marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE5DB', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12 },
  filterContainer: { marginBottom: 16 },
  filterPill: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE5DB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterPillSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  filterPillText: { color: '#555', fontSize: 13, fontWeight: '600' },
  filterPillTextSelected: { color: '#2E7D32', fontWeight: '700' },
  listContent: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#222', flex: 1 },
  timeBadge: { fontSize: 12, fontWeight: '700', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  categoryTag: { fontSize: 13, color: '#2E7D32', fontWeight: '600', marginBottom: 8 },
  detail: { fontSize: 15, color: '#4F4F4F', marginBottom: 5 },
  warningText: { color: '#D32F2F', fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 14, gap: 8 },
  tagPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { color: '#2E7D32', fontSize: 12, fontWeight: '700' },
  tagPillNeutral: { backgroundColor: '#ECEFF1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagTextNeutral: { color: '#607D8B', fontSize: 12, fontWeight: '700' },
  button: { backgroundColor: '#2E7D32', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#5C6F65' },
});