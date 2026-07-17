import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { app, db } from "./firebaseConfig.js";

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

export async function saveUserToDB(uid, nickname) {
  try {
    const userRef = doc(db, "users", uid);
    // 기존 데이터 유지하되, nickname은 무조건 덮어씌움.
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        nickname: nickname,
        statusMsg: "안녕하세요! 주사위 굴리러 왔습니다.",
        createdAt: serverTimestamp(),
        gamesPlayed: 0,
        profileViews: 0
      });
    } else {
      await setDoc(userRef, { nickname: nickname }, { merge: true });
    }
  } catch (error) {
    console.error("Firestore Save Error:", error);
    throw error;
  }
}

export async function updateUserStatusMsg(uid, newMsg) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { statusMsg: newMsg }, { merge: true });
    return true;
  } catch (error) {
    console.error("Status Update Error:", error);
    return false;
  }
}

export async function getUserFromDB(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Firestore Get Error:", error);
    return null;
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

export async function updateUserAvatar(uid, avatarUrl, cropData) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { avatarUrl, cropData }, { merge: true });
    return true;
  } catch (error) {
    console.error("Avatar Update Error:", error);
    return false;
  }
}
