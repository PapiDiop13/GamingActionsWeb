import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const useAuthStore = create((set, get) => ({
  user:        null,
  userProfile: null,
  loading:     true,
  initialized: false,

  init: () => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser });
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
        if (snap?.exists()) set({ userProfile: { uid: firebaseUser.uid, ...snap.data() } });
      } else {
        set({ user: null, userProfile: null });
      }
      set({ loading: false, initialized: true });
    });
    return unsub;
  },

  loginEmail: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  // Step 1 of sign-up: create Firebase Auth account, send verification email
  signUpEmail: async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await sendEmailVerification(cred.user); } catch (_) {}
    return cred.user;
  },

  // Forgot password
  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  loginGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    const isNew = !snap.exists();
    if (isNew) {
      // Minimal doc — will be completed on /complete-profile
      await setDoc(userRef, {
        uid:         cred.user.uid,
        email:       cred.user.email,
        avatar:      cred.user.photoURL || '',
        ggCount:     0,
        gaPoints:    0,
        followers:   0,
        following:   [],
        accountType: 'gamer',
        plan:        'free',
        createdAt:   serverTimestamp(),
      });
    }
    return { user: cred.user, isNew };
  },

  // Step 2: save the full profile (called from /complete-profile)
  saveProfile: async (fields) => {
    const { user, userProfile } = get();
    if (!user) throw new Error('Not authenticated');

    // Partial update (cosmetics, settings, etc.) — no username required
    if (!fields.username) {
      await setDoc(doc(db, 'users', user.uid), fields, { merge: true });
      set({ userProfile: { ...userProfile, ...fields } });
      return;
    }

    // Full profile creation / update with username
    const { username, accountType, mainGame, bio } = fields;
    const data = {
      uid:         user.uid,
      email:       user.email,
      username:    username.toUpperCase(),
      avatar:      user.photoURL || '',
      bio:         bio || '',
      accountType: accountType || 'gamer',
      mainGame:    mainGame || '',
      ggCount:     0,
      gaPoints:    0,
      followers:   0,
      following:   [],
      plan:        'free',
      createdAt:   serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    await updateProfile(user, { displayName: username.toUpperCase() });
    set({ userProfile: { ...data } });
  },

  // Check if a username is already taken
  checkUsername: async (username) => {
    const q = query(collection(db, 'users'), where('username', '==', username.toUpperCase()));
    const snap = await getDocs(q);
    return snap.empty; // true = available
  },

  logout: () => signOut(auth),

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
    if (snap?.exists()) set({ userProfile: { uid: user.uid, ...snap.data() } });
  },
}));

export default useAuthStore;
