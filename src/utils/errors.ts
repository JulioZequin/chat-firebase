import { FirebaseError } from 'firebase/app';

/** Erro de domínio com mensagem já pronta para o usuário. */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'auth/requires-recent-login': 'Sua sessão expirou. Entre novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  PERMISSION_DENIED: 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível no momento. Verifique sua conexão.',
  'deadline-exceeded': 'A operação demorou demais. Tente novamente.',
  'failed-precondition': 'A operação não pôde ser concluída. Tente novamente.',
  aborted: 'Outra alteração aconteceu ao mesmo tempo. Tente novamente.',
  'not-found': 'O item solicitado não foi encontrado.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Converte qualquer erro em uma mensagem compreensível, sem detalhes internos. */
export function toUserMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? fallback;
  }
  if (isRecord(error) && typeof error.code === 'string' && FIREBASE_MESSAGES[error.code]) {
    return FIREBASE_MESSAGES[error.code];
  }
  if (error instanceof Error && /permission[_ ]denied/i.test(error.message)) {
    return FIREBASE_MESSAGES['permission-denied'];
  }
  if (error instanceof TypeError && /network/i.test(error.message)) {
    return 'Sem conexão com a internet. Verifique sua rede.';
  }
  return fallback;
}

export function isPermissionDenied(error: unknown): boolean {
  if (error instanceof FirebaseError) return error.code === 'permission-denied';
  return error instanceof Error && /permission[_ ]denied/i.test(error.message);
}
