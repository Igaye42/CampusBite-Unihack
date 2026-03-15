import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type LocationSuggestion = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  aliases?: string[];
};

export type SelectedLocation = {
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

const MONASH_LOCATIONS: LocationSuggestion[] = [
  {
    place_id: "ltb",
    display_name: "Learning and Teaching Building, Monash Clayton",
    lat: "-37.9112",
    lon: "145.1340",
    aliases: ["ltb", "learning and teaching building", "learning teaching", "teaching building"]
  },
  {
    place_id: "campus-centre",
    display_name: "Campus Centre, Monash Clayton",
    lat: "-37.9106",
    lon: "145.1347",
    aliases: ["campus centre", "campus center", "cc"]
  },
  {
    place_id: "matheson",
    display_name: "Sir Louis Matheson Library, Monash Clayton",
    lat: "-37.9102",
    lon: "145.1324",
    aliases: ["matheson", "library", "sir louis matheson library"]
  },
  {
    place_id: "woodside",
    display_name: "Woodside Building, Monash Clayton",
    lat: "-37.9087",
    lon: "145.1339",
    aliases: ["woodside"]
  },
  {
    place_id: "engineering",
    display_name: "Engineering Building, Monash Clayton",
    lat: "-37.9089",
    lon: "145.1328",
    aliases: ["engineering", "eng building", "engineering building"]
  },
  {
    place_id: "hargraves",
    display_name: "Hargrave-Andrew Library, Monash Clayton",
    lat: "-37.9104",
    lon: "145.1349",
    aliases: ["hargraves", "hargrave", "hargrave-andrew library"]
  }
];

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
    }, 350);

    return () => clearTimeout(timeout);
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    try {
      setLoading(true);

      const lowerQuery = query.toLowerCase().trim();

      const localMatches = MONASH_LOCATIONS.filter((item) => {
        const inName = item.display_name.toLowerCase().includes(lowerQuery);
        const inAliases = item.aliases?.some((alias) =>
          alias.toLowerCase().includes(lowerQuery)
        );
        return inName || inAliases;
      });

      // Bias results around Monash Clayton
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + " Monash University Clayton Victoria Australia")}` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=8` +
        `&bounded=1` +
        `&viewbox=145.125,-37.905,145.145,-37.918`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      const data = await response.json();
      const osmMatches: LocationSuggestion[] = Array.isArray(data) ? data : [];

      const merged = [...localMatches];
      for (const item of osmMatches) {
        const exists = merged.some(
          (m) =>
            m.display_name.toLowerCase() === item.display_name.toLowerCase()
        );
        if (!exists) merged.push(item);
      }

      setSuggestions(merged);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Location search failed:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: LocationSuggestion) => {
    onChangeText(item.display_name);
    onSelectLocation({
      locationName: item.display_name,
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
        placeholderTextColor="#6B7280"
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
          {suggestions.map((item) => (
            <Pressable
              key={String(item.place_id)}
              style={styles.suggestionItem}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.suggestionText}>{item.display_name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {showSuggestions && !loading && value.trim().length >= 2 && suggestions.length === 0 && (
        <View style={styles.noResultsBox}>
          <Text style={styles.noResultsText}>No matching location found.</Text>
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
  },
  noResultsBox: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE5DB",
    borderRadius: 12,
    padding: 12
  },
  noResultsText: {
    fontSize: 13,
    color: "#666"
  }
});