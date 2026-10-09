import { HttpError } from '../middleware/errorHandler.js';
import {
  NOTIFICATION_POLICIES,
  type ConversationContext,
  type ConversationType,
  type MessageTarget,
  type NotificationPolicy,
  type StoredMessage,
} from '../types.js';
import { firebase } from './firebaseAdmin.js';

const ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_REGEX.test(value);
}

export function conversationTypeFromId(conversationId: string): ConversationType {
  return conversationId.startsWith('dm_') ? 'direct' : 'group';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (isRecord(value)) return Object.values(value).filter((v): v is string => typeof v === 'string');
  return [];
}

/** Lê a mensagem no Realtime Database. Devolve null se não existir. */
export async function loadMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await firebase().database.ref(`messages/${conversationId}/${messageId}`).get();
  if (!snapshot.exists()) return null;
  const value: unknown = snapshot.val();
  if (!isRecord(value) || typeof value.senderId !== 'string' || typeof value.text !== 'string') return null;
  return {
    id: messageId,
    conversationId,
    conversationType: value.conversationType === 'group' ? 'group' : 'direct',
    senderId: value.senderId,
    text: value.text,
    target: parseTarget(value.target),
    mentionedUserIds: parseStringList(value.mentionedUserIds),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
  };
}

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

/** Carrega participantes e política no Firestore (fonte da verdade). */
export async function loadConversation(conversationId: string): Promise<ConversationContext | null> {
  const { firestore } = firebase();
  if (conversationTypeFromId(conversationId) === 'direct') {
    const snapshot = await firestore.collection('directConversations').doc(conversationId).get();
    const data = snapshot.data();
    if (!data) return null;
    const ids: unknown = data.participantIds;
    if (!Array.isArray(ids) || ids.length !== 2 || typeof ids[0] !== 'string' || typeof ids[1] !== 'string') return null;
    return { type: 'direct', id: conversationId, participantIds: [ids[0], ids[1]] };
  }
  const snapshot = await firestore.collection('groups').doc(conversationId).get();
  const data = snapshot.data();
  if (!data) return null;
  return {
    type: 'group',
    id: conversationId,
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    memberIds: parseStringList(data.memberIds),
    policy: isPolicy(data.notificationPolicy) ? data.notificationPolicy : 'disabled',
  };
}

export function isParticipant(context: ConversationContext, uid: string): boolean {
  return context.type === 'direct' ? context.participantIds.includes(uid) : context.memberIds.includes(uid);
}

/**
 * Calcula, NO SERVIDOR, quem deve receber o push. Nunca usa lista enviada pelo app.
 *
 * - Conversa individual: o outro participante.
 * - all_group_messages: todos os integrantes, exceto o remetente.
 * - mentioned_members: só integrantes mencionados ou selecionados como destinatário.
 * - direct_messages_only: grupos não geram push.
 * - disabled: nenhum push.
 * Em todos os casos: o remetente é excluído e só participantes atuais podem receber.
 */
export function resolveRecipients(
  context: ConversationContext,
  message: Pick<StoredMessage, 'senderId' | 'target' | 'mentionedUserIds'>,
): string[] {
  if (!isParticipant(context, message.senderId)) {
    throw new HttpError(403, 'not-participant', 'O remetente não participa desta conversa.');
  }
  if (context.type === 'direct') {
    return context.participantIds.filter((id) => id !== message.senderId);
  }

  const members = new Set(context.memberIds);
  const withoutSender = (ids: Iterable<string>) =>
    Array.from(new Set(ids)).filter((id) => id !== message.senderId && members.has(id));

  switch (context.policy) {
    case 'all_group_messages':
      return withoutSender(context.memberIds);
    case 'mentioned_members': {
      const targeted = message.target.type === 'member' ? [message.target.memberId] : [];
      return withoutSender([...message.mentionedUserIds, ...targeted]);
    }
    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}
