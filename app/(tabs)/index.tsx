import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';

const listings = [
  {
    id: '1',
    foodType: 'Pizza',
    quantity: 6,
    unit: 'slices',
    location: 'Engineering Building',
    minutesLeft: 20,
    tags: ['vegetarian'],
    pickupBy: '5:20 PM',
  },
  {
    id: '2',
    foodType: 'Pastries',
    quantity: 8,
    unit: 'items',
    location: 'Campus Centre',
    minutesLeft: 45,
    tags: [],
    pickupBy: '6:00 PM',
  },
  {
    id: '3',
    foodType: 'Sandwich',
    quantity: 5,
    unit: 'packs',
    location: 'Library Cafe',
    minutesLeft: 15,
    tags: ['halal'],
    pickupBy: '4:45 PM',
  },
];

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
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Food Feed</Text>
      <Text style={styles.subheading}>Available food around campus right now</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
                item.tags.map((tag, index) => (
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
                    foodType: item.foodType,
                    quantity: `${item.quantity} ${item.unit}`,
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
});