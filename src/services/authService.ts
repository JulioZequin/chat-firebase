import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import type { LoginInput, PrivateProfile, PublicUser, RegisterInput } from '../types/user';
import type { NotificationPreferences } from '../types/notification';
import { AppError } from '../utils/errors';
import { isValidEmail, isValidPhone, parseBirthDate } from '../utils/validation';
import { auth, firestore } from './firebase';
import { uploadImage } from './storageService';

export type RegisterValidationErrors = Partial<Record<keyof RegisterInput | 'confirmPassword', string>>;

export function validateRegister(input: RegisterInput, confirmPassword: string): RegisterValidationErrors {
  const errors: RegisterValidationErrors = {};
  if (input.name.trim().length < 2) errors.name = 'Informe seu nome.';
  if (!isValidEmail(input.email)) errors.email = 'Informe um e-mail válido.';
  if (input.password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
  if (confirmPassword !== input.password) errors.confirmPassword = 'As senhas não conferem.';
  if (!isValidPhone(input.phoneNumber)) errors.phoneNumber = 'Informe um celular com DDD.';
  if (!parseBirthDate(input.birthDate)) errors.birthDate = 'Data inválida (DD/MM/AAAA).';
  if (!input.photoUri) errors.photoUri = 'Escolha uma foto de perfil.';
  return errors;
}

/**
 * Cria a conta no Firebase Authentication (e-mail e senha), envia a foto ao Cloudinary
 * e grava o perfil no Firestore. Se algo falhar depois da criação da conta,
 * a conta é removida para não deixar cadastro pela metade.
 */
export async function register(input: RegisterInput): Promise<User> {
  const birthDateIso = parseBirthDate(input.birthDate);
  if (!birthDateIso) throw new AppError('invalid-birth-date', 'Data de nascimento inválida.');

  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const user = credential.user;

  try {
    const photoUrl = input.photoUri ? await uploadImage(input.photoUri, { kind: 'user' }) : '';
    const name = input.name.trim();
    const now = Date.now();

    const publicUser: PublicUser = {
      uid: user.uid,
      name,
      nameLower: name.toLocaleLowerCase('pt-BR'),
      photoUrl,
      createdAt: now,
    };
    const privateProfile: PrivateProfile = {
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber,
      birthDate: birthDateIso,
    };
    const preferences: NotificationPreferences = { pushEnabled: true, updatedAt: now };

    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', user.uid), publicUser);
    batch.set(doc(firestore, 'users', user.uid, 'private', 'profile'), privateProfile);
    batch.set(doc(firestore, 'users', user.uid, 'private', 'preferences'), preferences);
    await batch.commit();

    await updateProfile(user, { displayName: name, photoURL: photoUrl || null });
    return user;
  } catch (error) {
    try {
      await deleteUser(user);
    } catch {
      await signOut(auth);
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
  return credential.user;
}

export function observeSession(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
