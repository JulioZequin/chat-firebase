import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type { AppConfig } from '../config.js';

export type FirebaseServices = {
  app: App;
  auth: Auth;
  firestore: Firestore;
  database: Database;
  messaging: Messaging;
};

let services: FirebaseServices | null = null;

/** Inicializa o Admin SDK com a conta de serviço vinda das variáveis secretas da hospedagem. */
export function initFirebase(config: AppConfig): FirebaseServices {
  if (services) return services;
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
      databaseURL: config.firebase.databaseURL,
    });
  services = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    database: getDatabase(app),
    messaging: getMessaging(app),
  };
  return services;
}

export function firebase(): FirebaseServices {
  if (!services) throw new Error('Firebase Admin não inicializado.');
  return services;
}
