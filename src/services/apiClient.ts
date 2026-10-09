import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { auth } from './firebase';

type HttpMethod = 'GET' | 'POST';

type RequestOptions = {
  method: HttpMethod;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

export type ApiErrorBody = { error?: { code?: string; message?: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorMessage(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const error = body.error;
  if (!isRecord(error)) return null;
  return typeof error.message === 'string' ? error.message : null;
}

/**
 * Chama a API online da equipe enviando o Firebase ID Token no header Authorization.
 * O app nunca possui credenciais administrativas: quem fala com o Admin SDK/FCM é a API.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions,
  parse: (body: unknown) => T,
): Promise<T> {
  if (!env.apiUrl) {
    throw new AppError('api-not-configured', 'A URL da API não foi configurada (EXPO_PUBLIC_API_URL).');
  }
  const user = auth.currentUser;
  if (!user) throw new AppError('unauthenticated', 'Sua sessão expirou. Entre novamente.');

  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch {
    throw new AppError('session-expired', 'Sua sessão expirou. Entre novamente.');
  }

  const controller = new AbortController();
  // API em plano gratuito pode "acordar" devagar; 30 s cobre o cold start.
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new AppError('network', 'Não foi possível falar com o servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const serverMessage = readErrorMessage(body);
    switch (response.status) {
      case 400:
        throw new AppError('bad-request', serverMessage ?? 'Requisição inválida.');
      case 401:
        throw new AppError('session-expired', 'Sua sessão expirou. Entre novamente.');
      case 403:
        throw new AppError('forbidden', serverMessage ?? 'Você não tem permissão para realizar esta ação.');
      case 404:
        throw new AppError('not-found', serverMessage ?? 'Item não encontrado.');
      case 429:
        throw new AppError('rate-limited', 'Muitas requisições. Aguarde um instante.');
      default:
        throw new AppError('server-error', 'O servidor não conseguiu concluir a operação.');
    }
  }

  return parse(body);
}
