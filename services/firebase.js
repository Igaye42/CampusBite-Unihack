import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCU7iAAY3tKzL8x6YpNBrR2LLGqsEAYdPM",
  authDomain: "campusbite-37f1e.firebaseapp.com",
  projectId: "campusbite-37f1e",
  storageBucket: "campusbite-37f1e.firebasestorage.app",
  messagingSenderId: "351835947768",
  appId: "1:351835947768:web:8c2bcfd71c815054baf10d"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Merges AI-extracted data with user manual input and saves it to the database.
 * @param {Object} aiData - The JSON output from the Gemini API.
 * @param {String} locationData - The manual location input from the user.
 * @param {Object} manualData - Optional manual overrides from the frontend.
 * @returns {Promise<String>} The generated document ID.
 */
export async function uploadFoodListing(aiData, locationData, manualData = {}) {
  try {
    // Process Dietary Tags
    const manualDietary = Array.isArray(manualData.dietary_tags) ? manualData.dietary_tags : [];
    const finalDietary = manualDietary.length > 0 ? manualDietary : (aiData.dietary_tags || []);

    // Process Allergen Warnings
    const manualAllergens = Array.isArray(manualData.allergen_warnings) ? manualData.allergen_warnings : [];
    const finalAllergens = manualAllergens.length > 0 ? manualAllergens : (aiData.allergen_warnings || []);

    const finalDeadline =
      manualData.pickup_deadline &&
      !isNaN(new Date(manualData.pickup_deadline).getTime())
        ? new Date(manualData.pickup_deadline).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const listing = {
      food_title: manualData.food_title || aiData.food_title,
      category: manualData.category || aiData.category,
      estimated_qty: manualData.estimated_qty || aiData.estimated_qty,
      estimated_weight_kg: aiData.estimated_weight_kg || 0.35,
      safety_risk: aiData.safety_risk || false,
      dietary_tags: finalDietary,
      allergen_warnings: finalAllergens,
      location: locationData,
      pickup_deadline: finalDeadline,
      status: "available",
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "listings"), listing);
    console.log("Listing successfully created with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding listing: ", e);
    throw e;
  }
}

/**
 * Retrieves all food listings with an 'available' status.
 * @returns {Promise<Array>} Array of available listing objects.
 */
export async function getAvailableListings() {
  try {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "available")
    );

    const querySnapshot = await getDocs(q);

    const now = new Date();

    const listings = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const deadline = data.pickup_deadline
        ? new Date(data.pickup_deadline)
        : null;

      const isNotExpired = deadline ? deadline.getTime() > now.getTime() : true;

      if (isNotExpired) {
        listings.push({ id: doc.id, ...data });
      }
    });

    listings.sort((a, b) => {
      const aTime = a.pickup_deadline ? new Date(a.pickup_deadline).getTime() : Infinity;
      const bTime = b.pickup_deadline ? new Date(b.pickup_deadline).getTime() : Infinity;
      return aTime - bTime;
    });

    console.log(`Successfully fetched ${listings.length} available non-expired listings.`);
    return listings;
  } catch (e) {
    console.error("Error fetching listings: ", e);
    throw e;
  }
}

/**
 * Sets up a real-time listener for available food listings.
 * @param {Function} callback - A callback function that receives the updated array of listings.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToAvailableListings(callback) {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "available")
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const now = new Date();

      const listings = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const deadline = data.pickup_deadline
          ? new Date(data.pickup_deadline)
          : null;

        const isNotExpired = deadline ? deadline.getTime() > now.getTime() : true;

        if (isNotExpired) {
          listings.push({ id: doc.id, ...data });
        }
      });

      listings.sort((a, b) => {
        const aTime = a.pickup_deadline ? new Date(a.pickup_deadline).getTime() : Infinity;
        const bTime = b.pickup_deadline ? new Date(b.pickup_deadline).getTime() : Infinity;
        return aTime - bTime;
      });

      console.log(
        `Real-time update: ${listings.length} available non-expired listings.`
      );
      callback(listings);
    },
    (error) => {
      console.error("Error listening to listings: ", error);
    }
  );

  return unsubscribe;
}

/**
 * Sets up a real-time listener for recently claimed food listings.
 * @param {Function} callback - A callback function that receives the updated array of claimed listings.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToClaimedListings(callback) {
  const q = query(collection(db, "listings"), where("status", "==", "claimed"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const listings = [];
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() });
      });

      // Sort manually to avoid requiring a composite index immediately
      listings.sort((a, b) => {
        const aTime = a.claimedAt?.toMillis() || 0;
        const bTime = b.claimedAt?.toMillis() || 0;
        return bTime - aTime;
      });

      console.log(`Real-time update: ${listings.length} claimed listings.`);
      callback(listings.slice(0, 15)); // Retain only the 15 most recent
    },
    (error) => {
      console.error("Error listening to claimed listings: ", error);
    }
  );

  return unsubscribe;
}

/**
 * Sets up a real-time listener to determine the top campus location based on claims.
 * @param {Function} callback - A callback function that receives the top location string.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToTopLocation(callback) {
  const q = query(collection(db, "listings"), where("status", "==", "claimed"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const locationCounts = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const loc = data.location;
        if (loc) {
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
      });

      let topLoc = "No claims yet";
      let maxCount = 0;

      for (const [loc, count] of Object.entries(locationCounts)) {
        if (count > maxCount) {
          maxCount = count;
          topLoc = loc;
        }
      }

      console.log(`Top location updated: ${topLoc} (${maxCount} claims)`);
      callback(topLoc);
    },
    (error) => {
      console.error("Error calculating top location: ", error);
    }
  );

  return unsubscribe;
}

/**
 * Executes an atomic transaction to claim a listing and updates dynamic campus impact metrics.
 * @param {String} listingId - The document ID of the listing to claim.
 * @returns {Promise<String>} The generated 4-character claim code.
 */
export async function claimListing(listingId) {
  try {
    const claimCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const listingRef = doc(db, "listings", listingId);

    // 1. Retrieve the specific item's AI-estimated weight
    const listingSnap = await getDoc(listingRef);
    if (!listingSnap.exists() || listingSnap.data().status !== "available") {
      throw new Error("Listing is no longer available.");
    }

    const itemWeight = listingSnap.data().estimated_weight_kg || 0.35;
    const itemCo2 = itemWeight * 2.5; // Calculate dynamic CO2 prevention

    // 2. Lock the specific listing
    await updateDoc(listingRef, {
      status: "claimed",
      claim_code: claimCode,
      claimedAt: serverTimestamp()
    });

    // 3. Increment the global campus impact metrics dynamically
    const metricsRef = doc(db, "metrics", "campus_totals");
    await updateDoc(metricsRef, {
      mealsSaved: increment(1),
      wasteReducedKg: increment(itemWeight),
      co2PreventedKg: increment(itemCo2)
    }).catch(async (error) => {
      // Create the metrics document if it doesn't exist yet (first claim)
      if (error.code === "not-found") {
        await setDoc(metricsRef, {
          mealsSaved: 1,
          wasteReducedKg: itemWeight,
          co2PreventedKg: itemCo2
        });
      }
    });

    console.log(`Listing claimed successfully. Code: ${claimCode}`);
    return claimCode;
  } catch (e) {
    console.error("Error claiming listing: ", e);
    throw e;
  }
}

/**
 * Fetches the total environmental impact metrics for the campus dashboard.
 * @returns {Promise<Object>} The aggregated metrics data.
 */
export async function getImpactStats() {
  try {
    const metricsRef = doc(db, "metrics", "campus_totals");
    const docSnap = await getDoc(metricsRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return { mealsSaved: 0, wasteReducedKg: 0, co2PreventedKg: 0 };
    }
  } catch (e) {
    console.error("Error fetching impact stats: ", e);
    throw e;
  }
}

/**
 * Sets up a real-time listener for campus impact metrics.
 * @param {Function} callback - A callback function that receives the updated metrics.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToImpactStats(callback) {
  const metricsRef = doc(db, "metrics", "campus_totals");

  const unsubscribe = onSnapshot(
    metricsRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback({ mealsSaved: 0, wasteReducedKg: 0, co2PreventedKg: 0 });
      }
    },
    (error) => {
      console.error("Error listening to impact stats: ", error);
    }
  );

  return unsubscribe;
}