import Constants from 'expo-constants';

function readExtra(key: string): string | null {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') return null;
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** URL pública da API: .env (EXPO_PUBLIC_API_URL) ou, se ausente, app.json → expo.extra.apiUrl. */
function readApiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL || readExtra('apiUrl') || '';
  return value.replace(/\/+$/, '');
}

function readEasProjectId(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const fromEas = Constants.easConfig?.projectId;
  if (fromEas) return fromEas;
  const extra = Constants.expoConfig?.extra;
  const eas = extra && typeof extra === 'object' ? (extra as Record<string, unknown>).eas : undefined;
  if (eas && typeof eas === 'object') {
    const projectId = (eas as Record<string, unknown>).projectId;
    if (typeof projectId === 'string') return projectId;
  }
  return null;
}

export const env = {
  apiUrl: readApiUrl(),
  easProjectId: readEasProjectId(),
} as const;
