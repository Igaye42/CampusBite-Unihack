import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { getAvailableListings, subscribeToAvailableListings } from '../../services/firebase';

function getFoodEmoji(foodType: string) {
  const lower = foodType.toLowerCase();

  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('pastries')) return '🥐';
  if (lower.includes('sandwich')) return '🥪';
  if (lower.includes('salad')) return '🥗';
  if (lower.includes('drink')) return '🥤';
  if (lower.includes('rice') || lower.includes('noodle')) return '🍱';

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

  useEffect(() => {
    // Subscribe to real-time updates from Firebase
    const unsubscribe = subscribeToAvailableListings((data: any[]) => {
      const formattedListings = data.map((item: any) => {
        const deadline = new Date(item.pickup_deadline);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();
        const minutesLeft = Math.max(0, Math.floor(diffMs / (1000 * 60)));

        return {
          id: item.id,
          foodType: item.category || 'Food',
          quantity: item.estimated_qty || 'Some',
          unit: '',
          location: item.location || 'Unknown Location',
          minutesLeft: minutesLeft,
          tags: item.tags || [],
          pickupBy: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });

      setListings(formattedListings);
      setLoading(false);
    });

    // Cleanup subscription when the component unmounts
    return () => unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Optional: Provide UI feedback by performing a manual background fetch while real-time handles the state
      await getAvailableListings();
    } catch (error) {
      console.error('Error on refresh: ', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Fetching fresh food...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Food Feed</Text>
      <Text style={styles.subheading}>Available food around campus right now</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍱</Text>
            <Text style={styles.emptyText}>No food available right now.</Text>
            <Text style={styles.emptySubtext}>Check back later or post something!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.title}>
                {getFoodEmoji(item.foodType)} {item.foodType}
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

            <Text style={styles.detail}>📍 {item.location}</Text>
            <Text style={styles.detail}>
              🍴 {item.quantity} {item.unit}
            </Text>
            <Text style={styles.detail}>⏰ Pickup by {item.pickupBy}</Text>

            <View style={styles.tagsRow}>
              {item.tags.length > 0 ? (
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
                    foodType: item.foodType,
                    quantity: `${item.quantity} ${item.unit}`.trim(),
                    location: item.location,
                    pickupBy: item.pickupBy,
                    tags: item.tags.length ? item.tags.join(', ') : 'None',
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
  container: {
    flex: 1,
    backgroundColor: '#F6F9F4',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B4332',
  },
  subheading: {
    fontSize: 14,
    color: '#5C6F65',
    marginTop: 4,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
    flex: 1,
  },
  timeBadge: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  detail: {
    fontSize: 15,
    color: '#4F4F4F',
    marginBottom: 5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 14,
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  tagPillNeutral: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagTextNeutral: {
    color: '#607D8B',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B4332',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#5C6F65',
    textAlign: 'center',
  },
});