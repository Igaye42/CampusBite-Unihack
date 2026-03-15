import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import {
  claimListing,
  subscribeToUserClaims,
  clearUserClaims
} from "../../services/firebase";

export default function ClaimScreen() {
  const { user } = useAuth();
  
  const {
    id,
    food_title,
    qty,
    location,
    locationDetails,
    latitude,
    longitude,
    safety_risk,
    uploaderName,
    uploaderAvatar
  } = useLocalSearchParams<{
    id?: string;
    food_title?: string;
    qty?: string;
    location?: string;
    locationDetails?: string;
    latitude?: string;
    longitude?: string;
    safety_risk?: string;
    uploaderName?: string;
    uploaderAvatar?: string;
  }>();

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Parse string back to boolean since router params are always strings
  const isHighRisk = safety_risk === 'true';

  useEffect(() => {
    setClaimed(false);
    setPickupCode("");
    setClaiming(false);
  }, [id]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserClaims(user.uid, (data: any[]) => {
        setRecentClaims(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleClearHistory = async () => {
    if (!user) return;
    
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your recently claimed history? This will hide them from this view.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive", 
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearUserClaims(user.uid);
            } catch (error) {
              Alert.alert("Error", "Failed to clear history.");
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  const executeClaim = async () => {
    setClaiming(true);
    try {
      // Non-null assertion as id is verified before this function is called
      const code = await claimListing(id!, user!.uid);
      setPickupCode(code);
      setClaimed(true);
    } catch (error) {
      console.error("Error claiming food:", error);
      Alert.alert("Error", "Failed to claim food. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimInitiation = () => {
    if (!id) {
      Alert.alert("Error", "No listing ID found.");
      return;
    }

    // Trigger safety acknowledgment protocol if risk is detected
    if (isHighRisk) {
      Alert.alert(
        "⚠️ Safety Warning",
        "This item contains raw ingredients or dairy. By claiming this, you acknowledge responsibility for proper refrigeration and safe consumption.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "I Understand & Claim", style: "destructive", onPress: executeClaim }
        ]
      );
    } else {
      executeClaim();
    }
  };

  const openMapsForNavigation = (
    destination: string,
    lat?: string,
    lng?: string
  ) => {
    const hasCoords = lat && lng;

    let url: string | undefined;

    if (hasCoords) {
      url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`
      });
    } else {
      if (!destination || destination === "Unknown Location") {
        Alert.alert(
          "Invalid Location",
          "No valid address provided for navigation."
        );
        return;
      }

      const encodedQuery = encodeURIComponent(destination);

      url = Platform.select({
        ios: `maps:0,0?q=${encodedQuery}`,
        android: `geo:0,0?q=${encodedQuery}`
      });
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open map application.");
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{id ? "Claim Item" : "Claim History"}</Text>

      {id && (
        <View style={styles.card}>
          <Pressable 
            style={styles.closeCardButton} 
            onPress={() => router.replace('/(tabs)/claim')}
          >
            <Ionicons name="close-circle" size={26} color="#B0BEB4" />
          </Pressable>

          <View style={styles.uploaderBar}>
            <Text style={styles.fromLabel}>From</Text>
            <View style={styles.posterProfile}>
              {uploaderAvatar ? (
                <Image source={{ uri: uploaderAvatar }} style={styles.posterAvatar} />
              ) : (
                <View style={styles.posterAvatarPlaceholder}>
                  <Text style={styles.posterAvatarText}>
                    {uploaderName?.charAt(0).toUpperCase() || "S"}
                  </Text>
                </View>
              )}
              <Text style={styles.posterName}>{uploaderName || "Student"}</Text>
            </View>
          </View>

          <Text style={styles.title}>{food_title || "Food Item"}</Text>
          <Text style={styles.detail}>
            📦 {qty ? `${qty} items` : "Unknown quantity"}
          </Text>
          <Text style={styles.detail}>📍 {location || "Unknown Location"}</Text>
          {locationDetails ? (
            <Text style={styles.detail}>🏢 {locationDetails}</Text>
          ) : null}

          <Pressable
            style={{ marginBottom: 16, marginTop: 4 }}
            onPress={() => openMapsForNavigation(location || "", latitude, longitude)}
          >
            <Text style={{ color: "#0277BD", fontWeight: "700", fontSize: 15 }}>
              🧭 Get Directions
            </Text>
          </Pressable>

          {isHighRisk && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ High Safety Risk</Text>
              <Text style={styles.warningText}>
                Requires immediate refrigeration. Inspect before consuming.
              </Text>
            </View>
          )}

          {!claimed ? (
            <Pressable
              style={[styles.button, claiming && { opacity: 0.7 }]}
              onPress={handleClaimInitiation}
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

      <Pressable
        style={styles.historyHeader}
        onPress={() => setShowHistory(!showHistory)}
      >
        <View style={styles.historyHeaderLeft}>
          <Text style={styles.historyHeaderText}>Your Recently Claimed</Text>
          <Ionicons 
            name={showHistory ? "chevron-down" : "chevron-forward"} 
            size={16} 
            color="#5C6F65" 
            style={{ marginLeft: 6 }}
          />
        </View>

        {showHistory && recentClaims.length > 0 && (
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              handleClearHistory();
            }}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && { opacity: 0.7 }
            ]}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : (
              <Text style={styles.clearButtonText}>Clear</Text>
            )}
          </Pressable>
        )}
      </Pressable>

      {showHistory && (
        <FlatList
          data={recentClaims}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.topRightClaimedBadge}>
                <Text style={styles.claimedBadgeText}>Claimed</Text>
              </View>

              <View style={styles.historyTopRow}>
                <Text style={styles.historyTitle}>
                  {item.food_title || item.category || "Food"}
                </Text>
              </View>

              <Text style={styles.historyDetail}>
                {item.location || "Unknown Location"}
              </Text>
              
              <View style={styles.historyUploaderBar}>
                <Text style={styles.historyFromLabel}>From</Text>
                <View style={styles.posterProfile}>
                  {item.uploaderAvatar ? (
                    <Image source={{ uri: item.uploaderAvatar }} style={styles.posterAvatar} />
                  ) : (
                    <View style={styles.posterAvatarPlaceholder}>
                      <Text style={styles.posterAvatarText}>
                        {item.uploaderName?.charAt(0).toUpperCase() || "S"}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.posterName}>{item.uploaderName || "Student"}</Text>
                </View>
              </View>

              <View>
                {item.claim_code && (
                  <Text style={styles.historyPickupCode}>
                    Pickup Code: {item.claim_code}
                  </Text>
                )}
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
      )}
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
    fontSize: 26,
    fontWeight: "800",
    color: "#1B4332",
    marginBottom: 12
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
    minHeight: 32, // Prevent jumping
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDE5DB",
    backgroundColor: "#fff",
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  historyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5C6F65",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    position: 'relative',
  },
  closeCardButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  uploaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  fromLabel: {
    fontSize: 14,
    color: "#5C6F65",
    fontWeight: "600",
  },
  historyUploaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    gap: 6,
  },
  historyFromLabel: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
  },
  posterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  posterAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  posterAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  posterAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  posterName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B4332",
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
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  warningBox: {
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    marginBottom: 12
  },
  warningTitle: {
    color: "#C62828",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4
  },
  warningText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "600"
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    position: 'relative',
    overflow: 'hidden',
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 60,
  },
  topRightClaimedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  claimedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#607D8B",
    textTransform: "uppercase",
  },
  historyPickupCode: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "800",
    marginTop: 2,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B4332",
    flex: 1,
  },

  historyDetail: {
    fontSize: 12,
    color: "#5C6F65",
    marginTop: 2,
  },
  historyTime: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
    marginTop: 2,
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