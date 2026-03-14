import * as ImagePicker from "expo-image-picker";
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

export default function PostScreen() {
  const [imageUri, setImageUri] = useState("");
  const [imageBase64, setImageBase64] = useState("");

  const [foodTitle, setFoodTitle] = useState("");
  const [category, setCategory] = useState("");

  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [tags, setTags] = useState("");
  const [deadline, setDeadline] = useState(""); // Restored state

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
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
      setAiAnalysisResult(aiData);

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

      const listingId = await uploadFoodListing(
        aiAnalysisResult,
        location.trim()
      );

      Alert.alert(
        "Success",
        `Food listing posted successfully.\nListing ID: ${listingId}`
      );

      setImageUri("");
      setImageBase64("");
      setAiAnalysisResult(null);
      setFoodTitle("");
      setCategory("");
      setLocation("");
      setQuantity("");
      setTags("");
      setDeadline(""); // Restored reset
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

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Specific Food</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={foodTitle}
            editable={false}
            placeholder="e.g. Cheese Pizza"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={category}
            editable={false}
            placeholder="e.g. meal"
          />
        </View>
      </View>

      <Text style={styles.label}>Pickup Location</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Engineering Building"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="Auto-filled from AI for now"
        value={quantity}
        onChangeText={setQuantity}
      />

      <Text style={styles.label}>Dietary Tags</Text>
      <TextInput
        style={styles.input}
        placeholder="Auto-filled from AI for now"
        value={tags}
        onChangeText={setTags}
      />

      {/* Restored Pickup Deadline Field */}
      <Text style={styles.label}>Pickup Deadline</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        placeholder="Auto-set in database to +2 hours"
        value={deadline}
        onChangeText={setDeadline}
        editable={false}
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
    marginBottom: 6,
    marginTop: 12,
    color: "#223"
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15
  },
  disabledInput: {
    backgroundColor: "#F5F5F5",
    color: "#757575"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
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
