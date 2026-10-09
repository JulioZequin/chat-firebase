import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import type { BatchResponse } from 'firebase-admin/messaging';
import type { DeviceRecord, PushContent, SendSummary } from '../types.js';
import { firebase } from './firebaseAdmin.js';

const ANDROID_CHANNEL_ID = 'messages';

/** Códigos do FCM que indicam token inválido/expirado → o dispositivo é desativado. */
const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

let expoClient: Expo | null = null;
export function configureExpo(accessToken: string | undefined): void {
  expoClient = new Expo(accessToken ? { accessToken } : {});
}

function expo(): Expo {
  if (!expoClient) expoClient = new Expo();
  return expoClient;
}

/** Busca os dispositivos ativos dos destinatários, respeitando a preferência pushEnabled. */
export async function loadDevices(recipientIds: string[]): Promise<DeviceRecord[]> {
  const { firestore } = firebase();
  const perUser = await Promise.all(
    recipientIds.map(async (uid) => {
      const userRef = firestore.collection('users').doc(uid);
      const prefs = await userRef.collection('private').doc('preferences').get();
      if (prefs.exists && prefs.get('pushEnabled') === false) return [];
      const devices = await userRef.collection('devices').where('enabled', '==', true).get();
      return devices.docs.flatMap((doc): DeviceRecord[] => {
        const token: unknown = doc.get('token');
        const provider: unknown = doc.get('provider');
        const platform: unknown = doc.get('platform');
        if (typeof token !== 'string' || (provider !== 'fcm' && provider !== 'expo')) return [];
        return [{ uid, deviceId: doc.id, token, provider, platform: platform === 'ios' ? 'ios' : 'android' }];
      });
    }),
  );
  // Remove tokens repetidos (mesmo aparelho registrado duas vezes).
  const seen = new Set<string>();
  return perUser.flat().filter((d) => (seen.has(d.token) ? false : (seen.add(d.token), true)));
}

async function disableDevices(devices: DeviceRecord[], reason: string): Promise<number> {
  if (devices.length === 0) return 0;
  const { firestore } = firebase();
  const batch = firestore.batch();
  for (const device of devices) {
    batch.update(firestore.collection('users').doc(device.uid).collection('devices').doc(device.deviceId), {
      enabled: false,
      disabledReason: reason,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  return devices.length;
}

async function sendViaFcm(devices: DeviceRecord[], content: PushContent) {
  if (devices.length === 0) return { delivered: 0, failed: 0, invalid: [] as DeviceRecord[] };
  const response: BatchResponse = await firebase().messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    notification: { title: content.title, body: content.body },
    data: content.data,
    android: {
      priority: 'high',
      collapseKey: content.data.conversationId,
      notification: { channelId: ANDROID_CHANNEL_ID, tag: content.data.conversationId, sound: 'default' },
    },
  });
  const invalid: DeviceRecord[] = [];
  response.responses.forEach((result, index) => {
    if (!result.success && result.error && INVALID_FCM_CODES.has(result.error.code)) invalid.push(devices[index]);
  });
  return { delivered: response.successCount, failed: response.failureCount, invalid };
}

async function sendViaExpo(devices: DeviceRecord[], content: PushContent) {
  const invalid: DeviceRecord[] = devices.filter((d) => !Expo.isExpoPushToken(d.token));
  const valid = devices.filter((d) => Expo.isExpoPushToken(d.token));
  let delivered = 0;
  let failed = invalid.length;
  const messages: ExpoPushMessage[] = valid.map((d) => ({
    to: d.token,
    title: content.title,
    body: content.body,
    data: content.data,
    sound: 'default',
    priority: 'high',
    channelId: ANDROID_CHANNEL_ID,
    threadId: content.data.conversationId,
  }));
  let offset = 0;
  for (const chunk of expo().chunkPushNotifications(messages)) {
    const tickets = await expo().sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket, i) => {
      const device = valid[offset + i];
      if (ticket.status === 'ok') {
        delivered += 1;
      } else {
        failed += 1;
        if (ticket.details?.error === 'DeviceNotRegistered' && device) invalid.push(device);
      }
    });
    offset += chunk.length;
  }
  return { delivered, failed, invalid };
}

/**
 * Envia o push: tokens FCM (Android) pelo Firebase Cloud Messaging via Admin SDK;
 * tokens Expo (iOS) pelo Expo Push Service. Tokens inválidos são desativados.
 */
export async function sendPush(recipientIds: string[], content: PushContent): Promise<SendSummary> {
  const devices = await loadDevices(recipientIds);
  const [fcm, expoResult] = await Promise.all([
    sendViaFcm(devices.filter((d) => d.provider === 'fcm'), content),
    sendViaExpo(devices.filter((d) => d.provider === 'expo'), content),
  ]);
  const invalidTokensDisabled = await disableDevices([...fcm.invalid, ...expoResult.invalid], 'invalid-token');
  return {
    recipients: recipientIds.length,
    devices: devices.length,
    delivered: fcm.delivered + expoResult.delivered,
    failed: fcm.failed + expoResult.failed,
    invalidTokensDisabled,
  };
}
