import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  claimListing,
  subscribeToClaimedListings
} from "../../services/firebase";

export default function ClaimScreen() {
  // 更新了接收的参数名称，与 index.tsx 传递的参数保持严格一致
  const { id, food_title, qty, location } = useLocalSearchParams<{
    id?: string;
    food_title?: string;
    qty?: string;
    location?: string;
  }>();

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [recentClaims, setRecentClaims] = useState<any[]>([]);

  useEffect(() => {
    setClaimed(false);
    setPickupCode("");
    setClaiming(false);
  }, [id]);

  useEffect(() => {
    const unsubscribe = subscribeToClaimedListings((data: any[]) => {
      setRecentClaims(data);
    });
    return () => unsubscribe();
  }, []);

  const handleClaim = async () => {
    if (!id) {
      Alert.alert("Error", "No listing ID found.");
      return;
    }

    setClaiming(true);
    try {
      const code = await claimListing(id);
      setPickupCode(code);
      setClaimed(true);
    } catch (error) {
      console.error("Error claiming food:", error);
      Alert.alert("Error", "Failed to claim food. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{id ? "Claim Item" : "Claim History"}</Text>

      {id && (
        <View style={styles.card}>
          <Text style={styles.title}>{food_title || "Food Item"}</Text>
          <Text style={styles.detail}>
            📦 {qty ? `${qty} items` : "Unknown quantity"}
          </Text>
          <Text style={styles.detail}>📍 {location || "Unknown Location"}</Text>

          {!claimed ? (
            <Pressable
              style={[styles.button, claiming && { opacity: 0.7 }]}
              onPress={handleClaim}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirm Claim</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successText}>Claim successful ✅</Text>
              <Text style={styles.code}>Pickup Code: {pickupCode}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.heading, { marginTop: id ? 24 : 0, fontSize: 20 }]}>
        Recently Claimed Feed
      </Text>

      <FlatList
        data={recentClaims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyTopRow}>
              {/* 优先显示具体食物名称，若无则降级显示宏观分类 */}
              <Text style={styles.historyTitle}>
                {item.food_title || item.category || "Food"}
              </Text>
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>Claimed</Text>
              </View>
            </View>
            <Text style={styles.historyDetail}>
              📍 {item.location || "Unknown Location"}
            </Text>
            {item.claimedAt && (
              <Text style={styles.historyTime}>
                Claimed at{" "}
                {new Date(item.claimedAt.toMillis()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </Text>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.historyEmoji}>🙌</Text>
            <Text style={styles.emptyText}>No recent claims.</Text>
            <Text style={styles.emptySubtext}>
              Be the first to claim food and reduce waste!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F9F4",
    padding: 16
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#222"
  },
  detail: {
    fontSize: 15,
    color: "#555",
    marginBottom: 6
  },
  button: {
    marginTop: 16,
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  successBox: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 12
  },
  successText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 8
  },
  code: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D32"
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333"
  },
  claimedBadge: {
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  claimedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#607D8B"
  },
  historyDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4
  },
  historyTime: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic"
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    flex: 1
  },
  historyEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 6
  },
  emptySubtext: {
    fontSize: 14,
    color: "#5C6F65",
    textAlign: "center"
  }
});
