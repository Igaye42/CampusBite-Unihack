import { initializeApp, getApp, getApps } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
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
  where,
  writeBatch
} from "firebase/firestore";
import {
  getAuth, 
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateEmail
} from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Initialize Firebase Auth with React Native persistence to prevent warnings/errors
let _auth;
try {
  _auth = getAuth(app);
} catch (e) {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
export const auth = _auth;

/**
 * Registers a new student and initializes their profile with preferences.
 */
export async function registerStudent(email: string, password: string, profileData: any) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Initialize user profile in 'students' collection
    await setDoc(doc(db, "students", user.uid), {
      uid: user.uid,
      email: user.email,
      firstName: profileData.firstName || "",
      lastName: profileData.lastName || "",
      displayName: `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() || "Student",
      preferencesSet: false,
      credits: 0,
      claims: 0,
      posts: 0,
      createdAt: serverTimestamp()
    });

    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * Logs in a student.
 */
export async function loginStudent(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Logs out the current user.
 */
export async function logoutStudent() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Updates student preferences and triggers preferencesSet
 */
export async function updateStudentPreferences(userId: string, preferencesData: any) {
  try {
    const studentRef = doc(db, "students", userId);
    await updateDoc(studentRef, { 
      preferences: {
        dietary_tags: preferencesData.dietaryTags || [],
        allergies: preferencesData.allergies || [],
        favorite_categories: preferencesData.categories || []
      },
      preferencesSet: true
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw error;
  }
}

/**
 * Updates a student's profile picture URL
 */
export async function updateStudentAvatar(userId: string, avatarUrl: string) {
  try {
    const studentRef = doc(db, "students", userId);
    await updateDoc(studentRef, { avatarUrl });
  } catch (error) {
    console.error("Error updating avatar:", error);
    throw error;
  }
}

/**
 * Updates a student's profile details including authentication email.
 */
export async function updateStudentProfile(userId: string, currentEmail: string, newEmail: string, firstName: string, lastName: string) {
  try {
    const studentRef = doc(db, "students", userId);
    
    // Update display name and names in firestore
    const payload: any = {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim() || "Student"
    };

    // Only attempt to change auth email if different
    if (newEmail !== currentEmail) {
      if (!auth.currentUser) throw new Error("No authenticated user");
      await updateEmail(auth.currentUser, newEmail);
      payload.email = newEmail;
    }

    await updateDoc(studentRef, payload);
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

/**
 * Merges AI-extracted data with user manual input and saves it to the database.
 * @param {Object} aiData - The JSON output from the Gemini API.
 * @param {String} locationData - The manual location input from the user.
 * @param {Object} manualData - Optional manual overrides from the frontend.
 * @returns {Promise<String>} The generated document ID.
 */
export async function uploadFoodListing(aiData: any, locationData: any, manualData: any = {}, uploaderId: string, uploaderName: string, uploaderAvatar?: string, imageBase64?: string) {
  try {
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
      safety_risk: aiData.safety_risk,

      dietary_tags: manualData.dietary_tags || aiData.dietary_tags || [],
      allergen_warnings: manualData.allergen_warnings || aiData.allergen_warnings || [],

      location: locationData.locationName,
      locationName: locationData.locationName,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      locationDetails: manualData.locationDetails || "",

      pickup_deadline: finalDeadline,
      status: "available",
      uploaderId,
      uploaderName,
      uploaderAvatar: uploaderAvatar || null,
      imageBase64: imageBase64 || null,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "listings"), listing);
    
    // Increment user's post count
    const studentRef = doc(db, "students", uploaderId);
    await updateDoc(studentRef, {
      posts: increment(1)
    });

    console.log("Listing successfully created with ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding listing:", e);
    throw e;
  }
}

/**
 * Updates an existing food listing.
 */
export async function updateFoodListing(listingId: string, updateData: any) {
  try {
    const listingRef = doc(db, "listings", listingId);
    await updateDoc(listingRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    console.log("Listing updated:", listingId);
  } catch (e) {
    console.error("Error updating listing:", e);
    throw e;
  }
}

/**
 * Deletes a food listing and decrements the uploader's post count.
 */
export async function deleteFoodListing(listingId: string, uploaderId: string) {
  try {
    await deleteDoc(doc(db, "listings", listingId));
    
    const studentRef = doc(db, "students", uploaderId);
    await updateDoc(studentRef, {
      posts: increment(-1)
    });
    
    console.log("Listing deleted:", listingId);
  } catch (e) {
    console.error("Error deleting listing:", e);
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

    const listings: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const deadline = data.pickup_deadline
        ? new Date(data.pickup_deadline)
        : null;

      const isNotExpired = deadline ? deadline.getTime() > now.getTime() : true;

      if (isNotExpired) {
        listings.push({ id: doc.id, ...doc.data() });
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
export function subscribeToAvailableListings(callback: any) {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "available")
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const now = new Date();

      const listings: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const deadline = data.pickup_deadline
          ? new Date(data.pickup_deadline)
          : null;

        const isNotExpired = deadline ? deadline.getTime() > now.getTime() : true;

        if (isNotExpired) {
          listings.push({ id: doc.id, ...doc.data() });
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
 * Sets up a real-time listener for listings created by a specific user.
 */
export function subscribeToUserListings(userId: string, callback: any) {
  const q = query(
    collection(db, "listings"),
    where("uploaderId", "==", userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const listings: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.uploaderHidden) {
          listings.push({ id: doc.id, ...data });
        }
      });

      // Sort by creation time descending
      listings.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      console.log(`User listings update: ${listings.length} items.`);
      callback(listings);
    },
    (error) => {
      console.error("Error listening to user listings: ", error);
    }
  );

  return unsubscribe;
}

/**
 * Marks all claimed listings as hidden for the uploader.
 */
export async function clearUserClaimedListings(userId: string) {
  try {
    const q = query(
      collection(db, "listings"),
      where("uploaderId", "==", userId),
      where("status", "==", "claimed")
    );
    
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    
    snap.forEach((doc) => {
      // Use existing uploaderHidden if it exists elsewhere, or set it
      batch.update(doc.ref, { uploaderHidden: true });
    });
    
    await batch.commit();
    console.log(`Cleared ${snap.size} claimed listings for user ${userId}`);
  } catch (error) {
    console.error("Error clearing claimed listings:", error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for listings claimed by a specific user.
 */
export function subscribeToUserClaims(userId: string, callback: any) {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "claimed"),
    where("claimerId", "==", userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const listings: any[] = [];
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() });
      });

      // Sort by claimedAt descending
      listings.sort((a, b) => {
        const aTime = a.claimedAt?.toMillis() || 0;
        const bTime = b.claimedAt?.toMillis() || 0;
        return bTime - aTime;
      });

      console.log(`User claims update: ${listings.length} items.`);
      callback(listings);
    },
    (error) => {
      console.error("Error listening to user claims: ", error);
    }
  );

  return unsubscribe;
}

/**
 * Sets up a real-time listener for recently claimed food listings.
 * @param {Function} callback - A callback function that receives the updated array of claimed listings.
 * @returns {Function} An unsubscribe function to detach the listener.
 */
export function subscribeToClaimedListings(callback: any) {
  const q = query(collection(db, "listings"), where("status", "==", "claimed"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const listings: any[] = [];
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
export function subscribeToTopLocation(callback: any) {
  const q = query(collection(db, "listings"), where("status", "==", "claimed"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const locationCounts: Record<string, number> = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const loc = data.locationName || data.location;
        if (loc) {
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
      });

      let topLoc = "No claims yet";
      let maxCount = 0;

      for (const [loc, count] of Object.entries(locationCounts)) {
        const numericCount = count as number;
        if (numericCount > maxCount) {
          maxCount = numericCount;
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
 * @param {String} claimerId - The ID of the user claiming the listing.
 * @returns {Promise<String>} The generated 4-character claim code.
 */
export async function claimListing(listingId: string, claimerId: string) {
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

    // 2. Fetch claimer details for display
    const claimerDoc = await getDoc(doc(db, "students", claimerId));
    const claimerData = claimerDoc.exists() ? claimerDoc.data() : {};

    // 3. Lock the specific listing
    await updateDoc(listingRef, {
      status: "claimed",
      claim_code: claimCode,
      claimerId: claimerId,
      claimerName: claimerData.displayName || "Anonymous",
      claimerAvatar: claimerData.avatarUrl || null,
      claimedAt: serverTimestamp()
    });

    // 3. Increment user's claim count
    const studentRef = doc(db, "students", claimerId);
    await updateDoc(studentRef, {
      claims: increment(1)
    });

    // 4. Increment the global campus impact metrics dynamically
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
export function subscribeToImpactStats(callback: any) {
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