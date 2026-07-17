import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, updateProfile } from "firebase/auth";
import { app } from "./firebaseConfig.js";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    throw error;
  }
}

export async function setNickname(user, nickname) {
  try {
    await updateProfile(user, { displayName: nickname });
    return true;
  } catch (error) {
    console.error("Update Profile Error:", error);
    throw error;
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function signOutUser() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
}
