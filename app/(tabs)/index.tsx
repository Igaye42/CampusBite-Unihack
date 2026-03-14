import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';

const listings = [
  {
    id: '1',
    foodType: 'Pizza',
    quantity: 6,
    location: 'Engineering Building',
    minutesLeft: 20,
    tags: ['vegetarian'],
    pickupBy: '5:20 PM',
  },
  {
    id: '2',
    foodType: 'Pastries',
    quantity: 8,
    location: 'Campus Centre',
    minutesLeft: 45,
    tags: [],
    pickupBy: '6:00 PM',
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Food Feed</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>🍽 {item.foodType}</Text>
            <Text style={styles.detail}>📍 {item.location}</Text>
            <Text style={styles.detail}>🍴 {item.quantity} items</Text>
            <Text style={styles.detail}>⏰ {item.minutesLeft} minutes left</Text>
            <Text style={styles.detail}>
              Tags: {item.tags.length ? item.tags.join(', ') : 'None'}
            </Text>

            <Pressable
              style={styles.button}
              onPress={() =>
                router.push({
                  pathname: '/claim',
                  params: {
                    foodType: item.foodType,
                    quantity: String(item.quantity),
                    location: item.location,
                    pickupBy: item.pickupBy,
                    tags: item.tags.join(', '),
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
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B4332',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },
  detail: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});