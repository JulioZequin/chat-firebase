/**
 * Perfil público (diretório) — `users/{uid}` no Firestore.
 * Legível por qualquer usuário autenticado para permitir busca e criação de conversas.
 */
export type PublicUser = {
  uid: string;
  name: string;
  nameLower: string;
  photoUrl: string;
  createdAt: number;
};

/**
 * Dados cadastrais privados — `users/{uid}/private/profile` no Firestore.
 * Somente o próprio usuário lê diretamente; terceiros só recebem pela API
 * quando compartilham uma conversa individual ou um grupo.
 */
export type PrivateProfile = {
  email: string;
  phoneNumber: string;
  birthDate: string;
};

/** Visão completa do usuário (tipagem sugerida no enunciado). */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};
