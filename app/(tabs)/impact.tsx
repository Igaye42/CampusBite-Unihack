import { View, Text, StyleSheet } from 'react-native';

export default function ImpactScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Monash Campus Impact</Text>

      <View style={styles.card}>
        <Text style={styles.number}>124</Text>
        <Text style={styles.label}>Meals Saved</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>42kg</Text>
        <Text style={styles.label}>Food Waste Reduced</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>31kg</Text>
        <Text style={styles.label}>CO₂ Prevented</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>Residential Hall A</Text>
        <Text style={styles.label}>Top Dorm</Text>
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: 'center',
    elevation: 3,
  },
  number: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 6,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
  },
});