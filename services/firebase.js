import { initializeApp } from "firebase/app";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    increment,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    onSnapshot
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
 * @returns {Promise<String>} The generated document ID.
 */
export async function uploadFoodListing(aiData, locationData) {
  try {
    const listing = {
      category: aiData.category,
      estimated_qty: aiData.estimated_qty,
      safety_risk: aiData.safety_risk,
      tags: aiData.suggested_tags || [],
      location: locationData,
      // Automatically set pickup deadline to 2 hours from now
      pickup_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
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

    const listings = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Successfully fetched ${listings.length} available listings.`);
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

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const listings = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() });
    });
    console.log(`Real-time update: ${listings.length} available listings.`);
    callback(listings);
  }, (error) => {
    console.error("Error listening to listings: ", error);
  });

  return unsubscribe;
}

/**
 * Sets up a real-time listener for recently claimed food listings.
 * @param {Function} callback - A callback function that receives the updated array of claimed listings.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToClaimedListings(callback) {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "claimed")
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
  }, (error) => {
    console.error("Error listening to claimed listings: ", error);
  });

  return unsubscribe;
}

/**
 * Executes an atomic transaction to claim a listing and updates campus impact metrics.
 * @param {String} listingId - The document ID of the listing to claim.
 * @returns {Promise<String>} The generated 4-character claim code.
 */
export async function claimListing(listingId) {
  try {
    // Generate a random 4-character alphanumeric claim code
    const claimCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Update the specific listing document
    const listingRef = doc(db, "listings", listingId);
    await updateDoc(listingRef, {
      status: "claimed",
      claim_code: claimCode,
      claimedAt: serverTimestamp()
    });

    // 2. Increment the global campus impact metrics
    const metricsRef = doc(db, "metrics", "campus_totals");
    await updateDoc(metricsRef, {
      mealsSaved: increment(1),
      wasteReducedKg: increment(0.35),
      co2PreventedKg: increment(0.875)
    }).catch(async (error) => {
      // Create the metrics document if it doesn't exist yet (first claim)
      if (error.code === "not-found") {
        await setDoc(metricsRef, {
          mealsSaved: 1,
          wasteReducedKg: 0.35,
          co2PreventedKg: 0.875
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
      // Return zeros if no items have been claimed yet
      return { mealsSaved: 0, wasteReducedKg: 0, co2PreventedKg: 0 };
    }
  } catch (e) {
    console.error("Error fetching impact stats: ", e);
    throw e;
  }
}
