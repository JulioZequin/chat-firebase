import { AppError } from '../utils/errors';
import { apiRequest } from './apiClient';

/**
 * Fotos de perfil e de grupo ficam no Cloudinary (plano gratuito, sem cartão).
 * Fluxo: o app pede à API uma assinatura de upload (a API confere quem é o usuário
 * e, para grupos, se ele é o proprietário) → o app envia o arquivo direto ao Cloudinary
 * → somente a URL https final é gravada no Firestore. Nada de Base64 nos bancos.
 */
export type UploadTarget = { kind: 'user' } | { kind: 'group'; groupId: string };

type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
};

/** Arquivo local no formato aceito pelo FormData do React Native. */
type ReactNativeFile = { uri: string; name: string; type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSignature(body: unknown): UploadSignature {
  if (
    !isRecord(body) ||
    typeof body.uploadUrl !== 'string' ||
    typeof body.apiKey !== 'string' ||
    typeof body.signature !== 'string' ||
    !isRecord(body.params)
  ) {
    throw new AppError('upload-signature', 'Resposta inválida ao preparar o envio da imagem.');
  }
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.params)) {
    if (typeof value === 'string') params[key] = value;
  }
  return { uploadUrl: body.uploadUrl, apiKey: body.apiKey, signature: body.signature, params };
}

function guessMimeType(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/** O FormData do RN aceita {uri, name, type}; a tipagem DOM só conhece string/Blob. */
function appendFile(form: FormData, field: string, file: ReactNativeFile): void {
  (form as unknown as { append(name: string, value: ReactNativeFile): void }).append(field, file);
}

export async function uploadImage(localUri: string, target: UploadTarget): Promise<string> {
  const signed = await apiRequest('/uploads/signature', { method: 'POST', body: target }, parseSignature);

  const form = new FormData();
  const type = guessMimeType(localUri);
  appendFile(form, 'file', { uri: localUri, name: `upload.${type.split('/')[1]}`, type });
  form.append('api_key', signed.apiKey);
  form.append('signature', signed.signature);
  for (const [key, value] of Object.entries(signed.params)) form.append(key, value);

  let response: Response;
  try {
    response = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new AppError('upload-network', 'Sem conexão para enviar a imagem. Tente novamente.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !isRecord(body) || typeof body.secure_url !== 'string') {
    throw new AppError('upload-failed', 'Não foi possível enviar a imagem. Tente outra foto.');
  }
  return body.secure_url;
}
