import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization — only runs in the browser, never during SSR/build
let _app, _auth, _db, _storage;

function getApp() {
  if (!_app) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getAuthInstance() {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getDbInstance() {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function getStorageInstance() {
  if (!_storage) _storage = getStorage(getApp());
  return _storage;
}

// Backwards-compatible named exports (safe because all pages are 'use client')
export const auth    = typeof window !== 'undefined' ? (() => { if (!_auth) _auth = getAuth(getApp()); return _auth; })() : null;
export const db      = typeof window !== 'undefined' ? (() => { if (!_db) _db = getFirestore(getApp()); return _db; })() : null;
export const storage = typeof window !== 'undefined' ? (() => { if (!_storage) _storage = getStorage(getApp()); return _storage; })() : null;
export default typeof window !== 'undefined' ? getApp() : null;
