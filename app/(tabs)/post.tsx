import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect } from "react";
import LocationAutocomplete, {
  SelectedLocation
} from "../../components/LocationAutocomplete";
import { useAuth } from "../../context/AuthContext";
import {
  clearUserClaimedListings,
  deleteFoodListing,
  subscribeToUserListings,
  updateFoodListing,
  uploadFoodListing
} from "../../services/firebase";
import { analyzeFoodImage } from "../../services/gemini";

const CATEGORIES = ["meal", "snack", "dessert", "drink", "groceries", "other"];
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Seafood-Free"
];
const WARNING_OPTIONS = [
  "Contains Peanuts",
  "Contains Nuts",
  "Contains Seafood",
  "Contains Dairy",
  "Contains Eggs"
];
export default function PostScreen() {
  const { user, studentData } = useAuth();
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(true);

  const [imageUri, setImageUri] = useState("");
  const [imageBase64, setImageBase64] = useState("");

  const [foodTitle, setFoodTitle] = useState("");
  const [category, setCategory] = useState("");

  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [locationDetails, setLocationDetails] = useState("");

  const [quantity, setQuantity] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [allergenWarnings, setAllergenWarnings] = useState<string[]>([]);

  const [deadline, setDeadline] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserListings(user.uid, (data: any[]) => {
        setUserListings(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const resetForm = () => {
    setImageUri("");
    setImageBase64("");
    setAiAnalysisResult(null);
    setFoodTitle("");
    setCategory("");
    setLocationInput("");
    setSelectedLocation(null);
    setLocationDetails("");
    setQuantity("");
    setDietaryTags([]);
    setAllergenWarnings([]);
    setDeadline(new Date(Date.now() + 2 * 60 * 60 * 1000));
    setIsCreatingListing(false);
    setEditingListing(null);
  };

  const formatDeadlineDisplay = (date: Date) => {
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleWarning = (warning: string) => {
    setAllergenWarnings((prev) =>
      prev.includes(warning)
        ? prev.filter((w) => w !== warning)
        : [...prev, warning]
    );
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access to upload food.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);

      if (!asset.base64) {
        Alert.alert("Upload failed", "Could not read image data.");
        return;
      }

      setImageBase64(asset.base64);
      setIsAnalyzing(true);

      const aiData = await analyzeFoodImage(asset.base64);

      if (aiData.contains_multiple_food_types) {
        Alert.alert(
          "Multiple Foods Detected 🛑",
          "Please post only one type of food per listing."
        );
        setImageUri("");
        setImageBase64("");
        return;
      }

      setAiAnalysisResult(aiData);
      setFoodTitle(aiData.food_title || "Unknown Food");
      setCategory(aiData.category || "other");

      if (aiData.estimated_qty) setQuantity(String(aiData.estimated_qty));
      setDietaryTags(Array.isArray(aiData.dietary_tags) ? aiData.dietary_tags : []);
      setAllergenWarnings(
        Array.isArray(aiData.allergen_warnings) ? aiData.allergen_warnings : []
      );
    } catch (error) {
      console.error("Image analysis failed:", error);
      Alert.alert("AI Error", "Failed to analyze the food image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to auto-fill your address.");
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });

      const address = geocode[0];
      const formattedAddress =
        `${address?.name || ""} ${address?.street || ""}`.trim() || "Current Location";

      setLocationInput(formattedAddress);
      setSelectedLocation({
        locationName: formattedAddress,
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handlePost = async () => {
    if (!imageBase64 || !aiAnalysisResult) {
      Alert.alert("Missing photo", "Please upload and analyze a food photo first.");
      return;
    }

    if (!selectedLocation) {
      Alert.alert("Missing location", "Please search and tap a location suggestion.");
      return;
    }

    try {
      setIsPosting(true);

      const finalData = {
        ...aiAnalysisResult,
        food_title: foodTitle,
        category,
        estimated_qty: quantity
      };

      await uploadFoodListing(
        finalData,
        selectedLocation,
        {
          food_title: foodTitle,
          category,
          estimated_qty: quantity,
          dietary_tags: dietaryTags,
          allergen_warnings: allergenWarnings,
          pickup_deadline: deadline.toISOString(),
          locationDetails: locationDetails.trim()
        },
        user!.uid,
        studentData?.displayName || "Anonymous",
        studentData?.avatarUrl,
        imageBase64 // Fix: passing imageBase64 to save food image
      );

      Alert.alert("Success", "Food listing posted successfully.", [
        {
          text: "OK",
          onPress: () => {
            resetForm();
          }
        }
      ]);
    } catch (error) {
      console.error("Post failed:", error);
      Alert.alert("Post failed", "Something went wrong while posting the listing.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingListing) return;
    try {
      setIsPosting(true);
      await updateFoodListing(editingListing.id, {
        food_title: foodTitle,
        category,
        estimated_qty: quantity,
        dietary_tags: dietaryTags,
        allergen_warnings: allergenWarnings,
        pickup_deadline: deadline.toISOString(),
        locationDetails: locationDetails.trim()
      });
      Alert.alert("Success", "Listing updated.");
      resetForm();
    } catch (e) {
      Alert.alert("Error", "Failed to update listing.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = (listingId: string) => {
    Alert.alert("Delete Listing", "Are you sure you want to delete this listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFoodListing(listingId, user!.uid);
          } catch (e) {
            Alert.alert("Error", "Failed to delete listing.");
          }
        }
      }
    ]);
  };

  const startEditing = (listing: any) => {
    setEditingListing(listing);
    setFoodTitle(listing.food_title);
    setCategory(listing.category);
    setQuantity(String(listing.estimated_qty));
    setDietaryTags(listing.dietary_tags || []);
    setAllergenWarnings(listing.allergen_warnings || []);
    setDeadline(new Date(listing.pickup_deadline));
    setLocationInput(listing.locationName);
    setSelectedLocation({
      locationName: listing.locationName,
      latitude: listing.latitude,
      longitude: listing.longitude
    });
    setLocationDetails(listing.locationDetails || "");
    setIsCreatingListing(true);
  };

  const handleClearClaimed = async () => {
    if (!user) return;

    // Check if there are any claimed listings to clear
    const hasClaimed = userListings.some(l => l.status === 'claimed');
    if (!hasClaimed) return;

    Alert.alert(
      "Clear Activity",
      "This will hide all claimed listings from your history. Claimers will still see them in their history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearUserClaimedListings(user.uid);
            } catch (e) {
              Alert.alert("Error", "Failed to clear activity.");
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  if (!isCreatingListing) {
    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.heading}>Your Listings</Text>
          <Text style={styles.subheading}>Manage your active food shares</Text>
        </View>

        <Pressable
          style={styles.heroPostButton}
          onPress={() => setIsCreatingListing(true)}
        >
          <View style={styles.heroPostContent}>
            <View style={styles.heroPostIcon}>
              <Ionicons name="add" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.heroPostTitle}>Post New Food</Text>
              <Text style={styles.heroPostSub}>Reduce waste in seconds</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2E7D32" />
        </Pressable>

        <Pressable 
          style={styles.sectionHeaderDropdown}
          onPress={() => setShowRecentActivity(!showRecentActivity)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Ionicons 
              name={showRecentActivity ? "chevron-down" : "chevron-forward"} 
              size={16} 
              color="#5C6F65" 
              style={{ marginLeft: 6 }}
            />
          </View>
          
          {showRecentActivity && userListings.some(l => l.status === 'claimed') && (
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                handleClearClaimed();
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

        {showRecentActivity && (
          <ScrollView contentContainerStyle={styles.listingsList}>
            {userListings.length > 0 ? (
              userListings.map((listing) => (
                <View key={listing.id} style={styles.listingCard}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle}>{listing.food_title}</Text>
                    <Text style={styles.listingMeta}>
                      {listing.locationName}{listing.status === 'available' ? ` • ${listing.status}` : ''}
                    </Text>
                    
                    {listing.status === 'claimed' && (
                      <View style={{ marginTop: 10 }}>
                        <View style={styles.claimerAttributionRow}>
                          <Text style={styles.claimerAttributionLabel}>Claimed by</Text>
                          <View style={styles.claimerProfile}>
                            {listing.claimerAvatar ? (
                              <Image source={{ uri: listing.claimerAvatar }} style={styles.claimerAvatar} />
                            ) : (
                              <View style={styles.claimerAvatarPlaceholder}>
                                <Text style={styles.claimerAvatarText}>
                                  {listing.claimerName?.charAt(0).toUpperCase() || "?"}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.claimerName} numberOfLines={1}>
                              {listing.claimerName || "Someone"}
                            </Text>
                          </View>
                        </View>
                        {listing.claim_code && (
                          <Text style={styles.pickupCodeMeta}>
                            Pickup Code: {listing.claim_code}
                          </Text>
                        )}
                        {listing.claimedAt && (
                          <Text style={styles.listingTime}>
                            Claimed at{" "}
                            {new Date(listing.claimedAt.toMillis()).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {listing.status === 'claimed' && (
                    <View style={styles.topRightClaimedBadge}>
                      <Text style={styles.claimedBadgeText}>Claimed</Text>
                    </View>
                  )}
                  {listing.status === 'available' && (
                    <View style={styles.actionRow}>
                      <Pressable style={styles.editButton} onPress={() => startEditing(listing)}>
                        <Ionicons name="pencil" size={16} color="#2E7D32" />
                      </Pressable>
                      <Pressable style={styles.deleteButton} onPress={() => handleDelete(listing.id)}>
                        <Ionicons name="trash-outline" size={16} color="#C62828" />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={48} color="#DDE5DB" />
                <Text style={styles.emptyStateText}>No listings yet.</Text>
                <Text style={styles.emptyStateSub}>Start by posting some leftover food!</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.formHeader}>
        <Pressable onPress={() => { resetForm(); setIsCreatingListing(false); }} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1B4332" />
        </Pressable>
        <Text style={styles.formHeaderText}>{editingListing ? "Edit Listing" : "New Listing"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Upload Photo</Text>
        <Pressable style={styles.photoButton} onPress={handlePickImage}>
          <Text style={styles.photoButtonText}>
            {imageUri ? "Change Photo" : "Choose Photo"}
          </Text>
        </Pressable>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}

        {isAnalyzing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2E7D32" />
            <Text style={styles.loadingText}>Analyzing food image...</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Specific Food</Text>
        <TextInput
          style={styles.input}
          value={foodTitle}
          onChangeText={setFoodTitle}
          placeholder="e.g. Cheese Pizza"
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.locationHeaderRow}>
          <Text style={styles.label}>Pickup Location</Text>
          <Pressable onPress={handleGetCurrentLocation} disabled={isFetchingLocation}>
            <Text style={styles.currentLocationText}>
              {isFetchingLocation ? "Locating..." : "📍 Use Current"}
            </Text>
          </Pressable>
        </View>

        <LocationAutocomplete
          value={locationInput}
          onChangeText={(text) => {
            setLocationInput(text);
            setSelectedLocation(null);
          }}
          onSelectLocation={(location) => {
            setSelectedLocation(location);
          }}
        />

        {selectedLocation && (
          <View style={styles.selectedLocationBox}>
            <Text style={styles.selectedLocationText}>
              ✅ Selected: {selectedLocation.locationName}
            </Text>
            <Text style={styles.selectedLocationSubtext}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Floor / Room Details (Optional)</Text>
        <TextInput
          style={styles.input}
          value={locationDetails}
          onChangeText={setLocationDetails}
          placeholder="e.g. Level 2, Room 214"
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="e.g. 5"
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.label}>Dietary Tags</Text>
        <View style={styles.tagsContainer}>
          {DIETARY_OPTIONS.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.tagPill, dietaryTags.includes(tag) && styles.tagPillActive]}
              onPress={() => toggleDietaryTag(tag)}
            >
              <Text style={[styles.tagText, dietaryTags.includes(tag) && styles.tagTextActive]}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: "#C62828", marginTop: 16 }]}>
          Allergen Warnings
        </Text>
        <View style={styles.tagsContainer}>
          {WARNING_OPTIONS.map((warn) => (
            <Pressable
              key={warn}
              style={[
                styles.warningPill,
                allergenWarnings.includes(warn) && styles.warningPillActive
              ]}
              onPress={() => toggleWarning(warn)}
            >
              <Text
                style={[
                  styles.warningTextPill,
                  allergenWarnings.includes(warn) && styles.warningTextActive
                ]}
              >
                {warn}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Pickup Deadline</Text>
        <Pressable style={styles.input} onPress={() => setShowDeadlinePicker(true)}>
          <Text style={{ fontSize: 15, color: "#222" }}>{formatDeadlineDisplay(deadline)}</Text>
        </Pressable>

        {showDeadlinePicker && (
          <DateTimePicker
            value={deadline}
            mode="datetime"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDeadlinePicker(false);
              if (selectedDate) setDeadline(selectedDate);
            }}
          />
        )}

        <Pressable
          style={[styles.postButton, (isPosting || (!editingListing && !imageBase64)) && styles.postButtonDisabled]}
          onPress={editingListing ? handleUpdate : handlePost}
          disabled={isPosting || (!editingListing && !imageBase64)}
        >
          {isPosting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>{editingListing ? "Update Listing" : "Post Food"}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: "#F6F9F4",
  },
  dashboardHeader: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7E0",
  },
  heroPostButton: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroPostContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroPostIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPostTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B4332",
  },
  heroPostSub: {
    fontSize: 14,
    color: "#5C6F65",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5C6F65",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeaderDropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    minHeight: 32, // Prevent jumping when clear button appears
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
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
  listingsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listingCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    position: 'relative',
    overflow: 'hidden',
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
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B4332",
  },
  listingMeta: {
    fontSize: 12,
    color: "#5C6F65",
    marginTop: 2,
    textTransform: "capitalize",
  },
  statusBadgeAvailable: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextAvailable: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeClaimed: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextClaimed: {
    color: "#757575",
    fontSize: 12,
    fontWeight: "700",
  },

  claimerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F8F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8F5E9",
    maxWidth: 160,
  },
  claimerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  claimerAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  claimerAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  claimerAttributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  claimerAttributionLabel: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
  },
  claimerName: {
    fontSize: 12,
    color: "#1B4332",
    fontWeight: "700",
  },
  pickupCodeMeta: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "800",
    marginTop: 2,
  },
  listingTime: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5C6F65",
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7E0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F6F9F4",
    justifyContent: "center",
    alignItems: "center",
  },
  formHeaderText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B4332",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B4332"
  },
  subheading: {
    fontSize: 14,
    color: "#5C6F65",
    marginTop: 4
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
    color: "#222"
  },
  locationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline"
  },
  currentLocationText: {
    color: "#2E7D32",
    fontWeight: "700",
    fontSize: 14
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15
  },
  selectedLocationBox: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    marginTop: 10
  },
  selectedLocationText: {
    color: "#1B5E20",
    fontWeight: "700",
    fontSize: 14
  },
  selectedLocationSubtext: {
    color: "#2E7D32",
    fontSize: 12,
    marginTop: 4
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  categoryPill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20
  },
  categoryPillActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32"
  },
  categoryText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600"
  },
  categoryTextActive: {
    color: "#2E7D32",
    fontWeight: "700"
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tagPill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  tagPillActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32"
  },
  tagText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600"
  },
  tagTextActive: {
    color: "#2E7D32",
    fontWeight: "700"
  },
  warningPill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  warningPillActive: {
    backgroundColor: "#C62828",
    borderColor: "#C62828"
  },
  warningTextPill: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "600"
  },
  warningTextActive: {
    color: "#fff",
    fontWeight: "700"
  },
  photoButton: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  photoButtonText: {
    color: "#2E7D32",
    fontWeight: "800",
    fontSize: 15
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginTop: 12
  },
  loadingBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12
  },
  loadingText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600"
  },
  postButton: {
    marginTop: 24,
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40
  },
  postButtonDisabled: {
    opacity: 0.7
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16
  }
});