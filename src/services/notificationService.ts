import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { env } from '../config/env';
import type {
  DeviceRegistration,
  NotificationPayload,
  NotificationRegistrationStatus,
  PushProvider,
} from '../types/notification';
import { AppError } from '../utils/errors';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';

export const ANDROID_CHANNEL_ID = 'messages';
const DEVICE_ID_KEY = 'chatfire.deviceId';

/* ------------------------------------------------------------------ */
/* Conversa aberta: evita banner de push para a conversa que está na tela */
/* ------------------------------------------------------------------ */
let activeConversationId: string | null = null;

export function setActiveConversation(conversationId: string | null): void {
  activeConversationId = conversationId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Lê `conversationId` e `conversationType` do payload, no iOS (data) e no Android (FCM remoteMessage). */
export function extractPayload(notification: Notifications.Notification): NotificationPayload | null {
  const sources: unknown[] = [notification.request.content.data];
  const trigger: unknown = notification.request.trigger;
  if (isRecord(trigger) && trigger.type === 'push') {
    const remoteMessage = trigger.remoteMessage;
    if (isRecord(remoteMessage)) sources.push(remoteMessage.data);
    sources.push(trigger.payload);
  }
  for (const source of sources) {
    if (!isRecord(source)) continue;
    const conversationId = source.conversationId;
    const conversationType = source.conversationType;
    if (typeof conversationId === 'string' && (conversationType === 'direct' || conversationType === 'group')) {
      return { conversationId, conversationType };
    }
  }
  return null;
}

/** Comportamento de notificações recebidas com o app em primeiro plano. */
export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const payload = extractPayload(notification);
      const isOpenConversation = payload !== null && payload.conversationId === activeConversationId;
      return {
        shouldShowBanner: !isOpenConversation,
        shouldShowList: !isOpenConversation,
        shouldPlaySound: !isOpenConversation,
        shouldSetBadge: false,
      };
    },
  });
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#0F766E',
  });
}

/* ------------------------------ Permissão ------------------------------ */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

/* ------------------------------ Token ------------------------------ */
async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const random = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const generated = `${Platform.OS}-${random}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

type PushToken = { token: string; provider: PushProvider };

/**
 * Android: token nativo do Firebase Cloud Messaging (enviado pela API com o Admin SDK).
 * iOS: token do Expo Push Service (que entrega via APNs) — o FCM no iOS exigiria o SDK nativo.
 */
async function getPushToken(): Promise<PushToken> {
  if (Platform.OS === 'android') {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (typeof deviceToken.data !== 'string' || deviceToken.data.length === 0) {
      throw new AppError('no-token', 'O dispositivo não forneceu um token FCM.');
    }
    return { token: deviceToken.data, provider: 'fcm' };
  }
  if (!env.easProjectId) {
    throw new AppError('no-project-id', 'Configure o projectId do EAS para gerar o token no iOS.');
  }
  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
  return { token: expoToken.data, provider: 'expo' };
}

async function saveDevice(uid: string, token: PushToken): Promise<void> {
  const deviceId = await getDeviceId();
  const platform: DeviceRegistration['platform'] = Platform.OS === 'ios' ? 'ios' : 'android';
  const registration: DeviceRegistration = {
    token: token.token,
    provider: token.provider,
    platform,
    enabled: true,
    updatedAt: Date.now(),
  };
  // `users/{uid}/devices` só é legível/gravável pelo próprio usuário (Security Rules).
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), registration);
}

/** Solicita permissão, obtém o token e registra o dispositivo no Firestore. */
export async function registerDevice(uid: string): Promise<NotificationRegistrationStatus> {
  if (!Device.isDevice) return { state: 'unsupported-device' };
  try {
    await ensureAndroidChannel();
    const granted = await requestPermission();
    if (!granted) return { state: 'permission-denied' };
    let token: PushToken;
    try {
      token = await getPushToken();
    } catch (error) {
      return {
        state: 'no-token',
        message: error instanceof AppError ? error.message : 'Não foi possível obter o token de notificações.',
      };
    }
    await saveDevice(uid, token);
    return { state: 'registered', provider: token.provider };
  } catch {
    return { state: 'error', message: 'Falha ao registrar o dispositivo para notificações.' };
  }
}

/** Atualiza o token quando o sistema o renova (rotação de token FCM). */
export function listenTokenRefresh(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener((devicePushToken) => {
    if (Platform.OS !== 'android' || typeof devicePushToken.data !== 'string') return;
    saveDevice(uid, { token: devicePushToken.data, provider: 'fcm' }).catch(() => undefined);
  });
  return () => subscription.remove();
}

/** No logout, desativa o dispositivo para o usuário anterior não receber mais pushes aqui. */
export async function disableCurrentDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  try {
    await updateDoc(doc(firestore, 'users', uid, 'devices', deviceId), { enabled: false, updatedAt: Date.now() });
  } catch {
    // dispositivo nunca registrado — nada a desativar
  }
}

/* ------------------------------ Envio (via API) ------------------------------ */
export type PushRequestResult = { duplicate: boolean; recipients: number };

function parsePushResult(body: unknown): PushRequestResult {
  if (!isRecord(body)) return { duplicate: false, recipients: 0 };
  return {
    duplicate: body.duplicate === true,
    recipients: typeof body.recipients === 'number' ? body.recipients : 0,
  };
}

/**
 * Pede à API online que envie o push da mensagem já persistida.
 * O app só envia `conversationId` e `messageId`; a API calcula os destinatários.
 * A API é idempotente, então é seguro tentar novamente após falha de rede.
 */
export async function requestMessagePush(conversationId: string, messageId: string): Promise<PushRequestResult> {
  const send = () =>
    apiRequest('/notifications/messages', { method: 'POST', body: { conversationId, messageId } }, parsePushResult);
  try {
    return await send();
  } catch (error) {
    if (error instanceof AppError && error.code === 'network') return send();
    throw error;
  }
}
