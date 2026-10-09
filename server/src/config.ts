function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

/**
 * Lê a configuração do ambiente. A chave privada costuma ser colada com "\n" literais
 * nos painéis de hospedagem; aqui ela é convertida para quebras de linha reais.
 */
export function loadConfig() {
  return {
    port: Number(process.env.PORT ?? 3000),
    firebase: {
      projectId: required('FIREBASE_PROJECT_ID'),
      clientEmail: required('FIREBASE_CLIENT_EMAIL'),
      privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      databaseURL: required('FIREBASE_DATABASE_URL'),
    },
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN?.trim() || undefined,
    cloudinary:
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
        ? {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME.trim(),
            apiKey: process.env.CLOUDINARY_API_KEY.trim(),
            apiSecret: process.env.CLOUDINARY_API_SECRET.trim(),
          }
        : null,
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
