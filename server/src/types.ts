export type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

/** Mensagem como lida do Realtime Database (já validada). */
export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type ConversationContext =
  | { type: 'direct'; id: string; participantIds: [string, string] }
  | { type: 'group'; id: string; name: string; ownerId: string; memberIds: string[]; policy: NotificationPolicy };

export type PushProvider = 'fcm' | 'expo';

export type DeviceRecord = {
  uid: string;
  deviceId: string;
  token: string;
  provider: PushProvider;
  platform: 'ios' | 'android';
};

export type PushContent = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: ConversationType; messageId: string };
};

export type SendSummary = {
  recipients: number;
  devices: number;
  delivered: number;
  failed: number;
  invalidTokensDisabled: number;
};

declare global {
  namespace Express {
    interface Locals {
      /** uid do Firebase Auth, preenchido pelo middleware authenticate */
      uid: string;
    }
  }
}
