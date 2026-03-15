import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
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

import { uploadFoodListing } from "../../services/firebase";
import { analyzeFoodImage } from "../../services/gemini";
import LocationAutocomplete, {
  SelectedLocation
} from "../../components/LocationAutocomplete";

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

      await uploadFoodListing(finalData, selectedLocation, {
        food_title: foodTitle,
        category,
        estimated_qty: quantity,
        dietary_tags: dietaryTags,
        allergen_warnings: allergenWarnings,
        pickup_deadline: deadline.toISOString(),
        locationDetails: locationDetails.trim()
      });

      Alert.alert("Success", "Food listing posted successfully.", [
        {
          text: "OK",
          onPress: () => {
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
            router.replace("/");
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Post Food</Text>
      <Text style={styles.subheading}>
        Upload leftover food and let AI classify it
      </Text>

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
        style={[styles.postButton, isPosting && styles.postButtonDisabled]}
        onPress={handlePost}
        disabled={isPosting}
      >
        {isPosting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.postButtonText}>Post Food</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F6F9F4",
    padding: 16
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B4332"
  },
  subheading: {
    fontSize: 14,
    color: "#5C6F65",
    marginTop: 4,
    marginBottom: 16
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