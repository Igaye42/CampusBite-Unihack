import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  subscribeToImpactStats,
  subscribeToTopLocation
} from "../../services/firebase";

export default function ImpactScreen() {
  const [stats, setStats] = useState({
    mealsSaved: 0,
    wasteReducedKg: 0,
    co2PreventedKg: 0
  });
  const [topLocation, setTopLocation] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToImpactStats((data: any) => {
      setStats({
        mealsSaved: data.mealsSaved || 0,
        wasteReducedKg: data.wasteReducedKg || 0,
        co2PreventedKg: data.co2PreventedKg || 0
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTopLocation((loc: string) => {
      setTopLocation(loc);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" }
        ]}
      >
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 12, color: "#2E7D32" }}>
          Loading impact data...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Monash Campus Impact</Text>
      <Text style={styles.subheading}>
        Our collective progress in reducing food waste
      </Text>

      <View style={styles.card}>
        <Text style={styles.number}>{stats.mealsSaved}</Text>
        <Text style={styles.label}>Meals Saved</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>
          {Number(stats.wasteReducedKg).toFixed(2)} kg
        </Text>
        <Text style={styles.label}>Food Waste Reduced</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>
          {Number(stats.co2PreventedKg).toFixed(2)} kg
        </Text>
        <Text style={styles.label}>CO₂ Prevented</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>📍 {topLocation}</Text>
        <Text style={styles.label}>Top Location</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F9F4",
    padding: 16
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B4332",
    marginBottom: 4
  },
  subheading: {
    fontSize: 14,
    color: "#5C6F65",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: "center",
    elevation: 3
  },
  number: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2E7D32",
    marginBottom: 6,
    textAlign: "center"
  },
  label: {
    fontSize: 16,
    color: "#444",
    textAlign: "center"
  }
});
