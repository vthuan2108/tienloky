/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface CultivationSaveData {
  userName: string;
  planningCompletedDate: string;
  reflectionCompletedDate: string;
  todoItems: any[];
  tasks: any[];
  habits: any[];
  challenges: any[];
  cultState: any;
  dailyLogs: any[];
  ieltsLogs: any[];
  ieltsTargets: any;
  camBooksList: any[];
  manuals: any[];
  notes: any[];
}

/**
 * Saves all user states to Firebase Firestore under the user's UID document.
 */
export async function saveUserDataToCloud(uid: string, data: CultivationSaveData): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving user data to Firestore:', error);
    throw error;
  }
}

/**
 * Fetches user states from Firebase Firestore.
 * Returns null if no document exists yet.
 */
export async function loadUserDataFromCloud(uid: string): Promise<CultivationSaveData | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as CultivationSaveData;
    }
    return null;
  } catch (error) {
    console.error('Error loading user data from Firestore:', error);
    throw error;
  }
}
