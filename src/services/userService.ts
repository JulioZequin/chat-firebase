import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatUser, PublicUser } from '../types/user';
import type { NotificationPreferences } from '../types/notification';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parsePublicUser(uid: string, data: DocumentData): PublicUser {
  const name = asString(data.name, 'Usuário');
  return {
    uid,
    name,
    nameLower: asString(data.nameLower, name.toLowerCase()),
    photoUrl: asString(data.photoUrl),
    createdAt: asNumber(data.createdAt),
  };
}

/** Diretório de usuários em tempo real (dados públicos: nome e foto). */
export function observeUserDirectory(
  onChange: (users: PublicUser[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(firestore, 'users'), orderBy('nameLower'), limit(500));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => parsePublicUser(d.id, d.data()))),
    onError,
  );
}

export async function getPublicUser(uid: string): Promise<PublicUser | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? parsePublicUser(snapshot.id, snapshot.data()) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseProfileResponse(body: unknown): ChatUser {
  if (!isRecord(body) || !isRecord(body.profile)) throw new Error('Resposta inválida da API.');
  const p = body.profile;
  return {
    uid: asString(p.uid),
    name: asString(p.name),
    email: asString(p.email),
    phoneNumber: asString(p.phoneNumber),
    birthDate: asString(p.birthDate),
    photoUrl: asString(p.photoUrl),
    createdAt: asNumber(p.createdAt),
  };
}

/**
 * Busca o perfil cadastral. A API só devolve os dados se o solicitante compartilhar
 * uma conversa individual ou um grupo com o usuário consultado (validação no servidor).
 */
export function fetchProfile(uid: string): Promise<ChatUser> {
  return apiRequest(`/users/${encodeURIComponent(uid)}/profile`, { method: 'GET' }, parseProfileResponse);
}

export function observePreferences(
  uid: string,
  onChange: (preferences: NotificationPreferences) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'users', uid, 'private', 'preferences'),
    (snapshot) => {
      const data = snapshot.data();
      onChange({
        pushEnabled: data ? data.pushEnabled !== false : true,
        updatedAt: data ? asNumber(data.updatedAt) : 0,
      });
    },
    onError,
  );
}

export async function setPushEnabled(uid: string, pushEnabled: boolean): Promise<void> {
  const preferences: NotificationPreferences = { pushEnabled, updatedAt: Date.now() };
  await setDoc(doc(firestore, 'users', uid, 'private', 'preferences'), preferences);
}
