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

import { uploadFoodListing } from "../../services/firebase";
import { analyzeFoodImage } from "../../services/gemini";

const CATEGORIES = ["meal", "snack", "dessert", "other"];

export default function PostScreen() {
  const [imageUri, setImageUri] = useState("");
  const [imageBase64, setImageBase64] = useState("");

  const [foodTitle, setFoodTitle] = useState("");
  const [category, setCategory] = useState("");

  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [tags, setTags] = useState("");
  const [deadline, setDeadline] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to upload food."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      // Intercept and block if multiple distinct food types are detected
      if (aiData.contains_multiple_food_types) {
        Alert.alert(
          "Multiple Foods Detected 🛑",
          "Please post only one type of food per listing to make claiming easier. If you have different items (e.g., pizza AND salad), please take separate photos and make multiple posts."
        );
        // Clear the invalid image so the user is forced to pick a new one
        setImageUri("");
        setImageBase64("");
        return;
      }

      setAiAnalysisResult(aiData);

      // Auto-fill from AI analysis
      setFoodTitle(aiData.food_title || "Unknown Food");
      setCategory(aiData.category || "other");

      if (aiData.estimated_qty) setQuantity(String(aiData.estimated_qty));
      if (aiData.suggested_tags?.length)
        setTags(aiData.suggested_tags.join(", "));
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
        Alert.alert(
          "Permission Denied",
          "Allow location access to auto-fill your address."
        );
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        // Combine building name and street name
        const formattedAddress =
          `${address.name || ""} ${address.street || ""}`.trim();
        setLocation(formattedAddress || "Unknown Location");
      }
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handlePost = async () => {
    if (!imageBase64 || !aiAnalysisResult) {
      Alert.alert(
        "Missing photo",
        "Please upload and analyze a food photo first."
      );
      return;
    }

    if (!location.trim()) {
      Alert.alert("Missing location", "Please enter a pickup location.");
      return;
    }

    try {
      setIsPosting(true);

      // Override the AI's original data with any manual user edits
      const finalData = {
        ...aiAnalysisResult,
        food_title: foodTitle,
        category: category,
        estimated_qty: quantity
      };

      const listingId = await uploadFoodListing(finalData, location.trim(), {
  food_title: foodTitle,
  category: category,
  estimated_qty: quantity,
  tags: tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
  pickup_deadline: deadline
});

      Alert.alert(
        "Success",
        `Food listing posted successfully.\nListing ID: ${listingId}`
      );

      // Clear the form
      setImageUri("");
      setImageBase64("");
      setAiAnalysisResult(null);
      setFoodTitle("");
      setCategory("");
      setLocation("");
      setQuantity("");
      setTags("");
      setDeadline("");
    } catch (error) {
      console.error("Post failed:", error);
      Alert.alert(
        "Post failed",
        "Something went wrong while posting the listing."
      );
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

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      ) : null}

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
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryPill,
              category === cat && styles.categoryPillActive
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                category === cat && styles.categoryTextActive
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.locationHeaderRow}>
        <Text style={styles.label}>Pickup Location</Text>
        <Pressable
          onPress={handleGetCurrentLocation}
          disabled={isFetchingLocation}
        >
          <Text style={styles.currentLocationText}>
            {isFetchingLocation ? "Locating..." : "📍 Use Current"}
          </Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        placeholder="e.g. Engineering Building"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="Auto-filled from AI, but editable"
        value={quantity}
        onChangeText={setQuantity}
      />

      <Text style={styles.label}>Dietary Tags</Text>
      <TextInput
        style={styles.input}
        placeholder="Auto-filled from AI, but editable"
        value={tags}
        onChangeText={setTags}
      />

      <Text style={styles.label}>Pickup Deadline</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5:00 PM today"
        value={deadline}
        onChangeText={setDeadline}
      />

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
