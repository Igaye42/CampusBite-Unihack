import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

function generatePickupCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CB-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ClaimScreen() {
  const { foodType, quantity, location, pickupBy, tags } = useLocalSearchParams<{
    foodType?: string;
    quantity?: string;
    location?: string;
    pickupBy?: string;
    tags?: string;
  }>();

  const [claimed, setClaimed] = useState(false);
  const [pickupCode, setPickupCode] = useState('');

  const handleClaim = () => {
    const code = generatePickupCode();
    setPickupCode(code);
    setClaimed(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Claim Screen</Text>

      <View style={styles.card}>
        <Text style={styles.title}>{foodType || 'Pizza'}</Text>
        <Text style={styles.detail}>{quantity || '6'} items</Text>
        <Text style={styles.detail}>{location || 'Engineering Building'}</Text>
        <Text style={styles.detail}>Pickup by {pickupBy || '5:20 PM'}</Text>
        <Text style={styles.detail}>Tags: {tags || 'None'}</Text>

        {!claimed ? (
          <Pressable style={styles.button} onPress={handleClaim}>
            <Text style={styles.buttonText}>Confirm Claim</Text>
          </Pressable>
        ) : (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Claim successful ✅</Text>
            <Text style={styles.code}>Pickup Code: {pickupCode}</Text>
          </View>
        )}
      </View>
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
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },
  detail: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  successBox: {
    marginTop: 16,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },
  code: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D32',
  },
});