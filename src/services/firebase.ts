import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebaseConfig.json';

/** Configuração do SDK cliente — versionada em `firebaseConfig.json` (sem segredos). */
const firebaseConfig: FirebaseOptions = firebaseConfigJson;

function createApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function createAuth(app: FirebaseApp): Auth {
  try {
    // Persiste a sessão no AsyncStorage para recuperá-la ao reabrir o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Em fast refresh o Auth já foi inicializado.
    return getAuth(app);
  }
}

export const app: FirebaseApp = createApp();
export const auth: Auth = createAuth(app);
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
