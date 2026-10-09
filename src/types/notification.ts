export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
] as const;

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type PushProvider = 'fcm' | 'expo';

/** `users/{uid}/devices/{deviceId}` no Firestore. */
export type DeviceRegistration = {
  token: string;
  provider: PushProvider;
  platform: 'ios' | 'android';
  enabled: boolean;
  updatedAt: number;
};

/** `users/{uid}/private/preferences` no Firestore. */
export type NotificationPreferences = {
  pushEnabled: boolean;
  updatedAt: number;
};

/** Dados mínimos que chegam no payload do push. */
export type NotificationPayload = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

export type NotificationRegistrationStatus =
  | { state: 'idle' }
  | { state: 'registering' }
  | { state: 'registered'; provider: PushProvider }
  | { state: 'permission-denied' }
  | { state: 'unsupported-device' }
  | { state: 'no-token'; message: string }
  | { state: 'error'; message: string };
