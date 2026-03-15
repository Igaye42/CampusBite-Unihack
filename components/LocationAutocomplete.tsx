import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type LocationSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
};

type SelectedLocation = {
  locationName: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation: (location: SelectedLocation) => void;
  placeholder?: string;
};

export default function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = "Search building, cafe, or address..."
}: Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetchSuggestions(value);
    }, 400);

    return () => clearTimeout(timeout);
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    try {
      setLoading(true);

      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + " Monash University Melbourne Australia")}` +
        `&format=json&addressdetails=1&limit=6`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Location search failed:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: LocationSuggestion) => {
    const locationName = item.display_name;

    onChangeText(locationName);
    onSelectLocation({
      locationName,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    });

    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setShowSuggestions(true);
        }}
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.loadingText}>Searching locations...</Text>
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={suggestions}
            keyExtractor={(item) => String(item.place_id)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionText}>{item.display_name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%"
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  },
  loadingText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "600"
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 220,
    overflow: "hidden"
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2ED"
  },
  suggestionText: {
    fontSize: 14,
    color: "#222"
  }
});