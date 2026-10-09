import { createHash } from 'node:crypto';

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

let config: CloudinaryConfig | null = null;

export function configureCloudinary(value: CloudinaryConfig | null): void {
  config = value;
}

export function cloudinaryConfig(): CloudinaryConfig | null {
  return config;
}

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  params: Record<string, string>;
  signature: string;
};

/**
 * Assina um upload para o Cloudinary (https://cloudinary.com/documentation/authentication_signatures).
 * O segredo fica só na API; o app recebe apenas a assinatura, válida para ESTA pasta/arquivo
 * e por tempo limitado (o Cloudinary recusa assinaturas com mais de 1 hora).
 */
export function signUpload(cfg: CloudinaryConfig, folder: string, publicId: string): UploadSignature {
  const params: Record<string, string> = {
    allowed_formats: 'jpg,jpeg,png,webp,heic',
    folder,
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const signature = createHash('sha1').update(toSign + cfg.apiSecret).digest('hex');
  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    params,
    signature,
  };
}
