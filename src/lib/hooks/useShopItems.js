'use client';
/**
 * useShopItems.js
 * Reads shop items from Firestore shop_items collection in real-time.
 * Falls back to local JS data if Firestore is empty or errors.
 *
 * Usage:
 *   const { shopData, loading } = useShopItems();
 *   shopData.avatar_frames  → array of avatar frame items
 *   shopData.backgrounds    → array of background items
 *   etc.
 */

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  PROFILE_BACKGROUNDS, PROFILE_BANNERS, USERNAME_EFFECTS,
  PROFILE_BADGES, CARD_BORDERS, PROFILE_THEMES,
} from '@/lib/cosmetics';
import { FRAMES, VIDEO_FRAMES, COMMENT_FRAMES } from '@/lib/frames';

// Build local fallback data (same structure as Firestore docs)
function buildLocalShopData() {
  const toDoc = (item, category, itemType) => ({
    ...item,
    category,
    itemType,
    active: true,
    dollarsPrice: item.dollarsPrice || null,
    pointsPrice: item.pointsPrice || 0,
  });

  return {
    avatar_frames: FRAMES
      .filter(f => !f.exclusive)
      .map(f => toDoc(f, 'avatar_frame', 'avatar_frame'))
      .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0)),

    video_frames: VIDEO_FRAMES
      .filter(f => !f.exclusive)
      .map(f => toDoc(f, 'video_frame', 'video_frame'))
      .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0)),

    comment_frames: COMMENT_FRAMES
      .filter(f => !f.exclusive)
      .map(f => toDoc(f, 'comment_frame', 'comment_frame'))
      .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0)),

    backgrounds: PROFILE_BACKGROUNDS
      .map(i => toDoc(i, 'background', 'cosmetic')),

    banners: PROFILE_BANNERS
      .map(i => toDoc(i, 'banner', 'cosmetic')),

    badges: PROFILE_BADGES
      .map(i => toDoc(i, 'badge', 'cosmetic')),

    username_effects: USERNAME_EFFECTS
      .map(i => toDoc(i, 'username_effect', 'cosmetic')),

    card_borders: CARD_BORDERS
      .map(i => toDoc(i, 'card_border', 'cosmetic')),

    themes: PROFILE_THEMES
      .map(i => toDoc(i, 'theme', 'theme')),
  };
}

function groupItems(docs) {
  const g = {
    avatar_frames: [],
    video_frames: [],
    comment_frames: [],
    backgrounds: [],
    banners: [],
    badges: [],
    username_effects: [],
    card_borders: [],
    themes: [],
  };

  for (const doc of docs) {
    switch (doc.category) {
      case 'avatar_frame':    g.avatar_frames.push(doc); break;
      case 'video_frame':     g.video_frames.push(doc); break;
      case 'comment_frame':   g.comment_frames.push(doc); break;
      case 'background':      g.backgrounds.push(doc); break;
      case 'banner':          g.banners.push(doc); break;
      case 'badge':           g.badges.push(doc); break;
      case 'username_effect': g.username_effects.push(doc); break;
      case 'card_border':     g.card_borders.push(doc); break;
      case 'theme':           g.themes.push(doc); break;
    }
  }

  // Sort frames by price
  g.avatar_frames.sort((a, b) => (a.order ?? a.pointsPrice ?? 0) - (b.order ?? b.pointsPrice ?? 0));
  g.video_frames.sort((a, b) => (a.order ?? a.pointsPrice ?? 0) - (b.order ?? b.pointsPrice ?? 0));
  g.comment_frames.sort((a, b) => (a.order ?? a.pointsPrice ?? 0) - (b.order ?? b.pointsPrice ?? 0));

  return g;
}

export function useShopItems() {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Immediately set local data so UI renders fast
    setShopData(buildLocalShopData());
    setLoading(false);

    // Then try to load from Firestore in background
    try {
      const q = query(
        collection(db, 'shop_items'),
        where('active', '==', true)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            // Firestore empty — keep local data
            return;
          }
          const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          setShopData(groupItems(docs));
          setFromFirestore(true);
        },
        (err) => {
          // Firestore error — keep local data (already set above)
          console.warn('[useShopItems] Firestore error, using local data:', err.message);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('[useShopItems] Failed to subscribe to Firestore:', err.message);
    }
  }, []);

  return { shopData, loading, fromFirestore };
}
