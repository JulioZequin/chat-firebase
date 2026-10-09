import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
  update,
  type DataSnapshot,
} from 'firebase/database';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  DirectConversationDocument,
  MessageTarget,
  OutgoingMessage,
} from '../types/chat';
import { AppError } from '../utils/errors';
import { buildDirectConversationId, sortedPair } from '../utils/conversationId';
import { firestore, realtimeDb } from './firebase';

const MESSAGE_PAGE_SIZE = 200;
export const MAX_MESSAGE_LENGTH = 2000;

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
  // O RTDB pode devolver arrays como objeto { "0": "...", "1": "..." }.
  if (isRecord(value)) return Object.values(value).filter((v): v is string => typeof v === 'string');
  return [];
}

/** Valida e converte um registro do RTDB em ChatMessage (descarta registros malformados). */
export function parseMessage(id: string, conversationId: string, value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null;
  if (typeof value.senderId !== 'string' || typeof value.text !== 'string') return null;
  const conversationType: ConversationType = value.conversationType === 'group' ? 'group' : 'direct';
  return {
    id,
    conversationId,
    conversationType,
    senderId: value.senderId,
    text: value.text,
    target: parseTarget(value.target),
    mentionedUserIds: parseStringList(value.mentionedUserIds),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
  };
}

function parseDirectConversation(id: string, data: DocumentData): DirectConversation | null {
  const ids = Array.isArray(data.participantIds) ? data.participantIds : [];
  if (ids.length !== 2 || typeof ids[0] !== 'string' || typeof ids[1] !== 'string') return null;
  return {
    id,
    type: 'direct',
    participants: [ids[0], ids[1]],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

/**
 * Localiza ou cria a conversa individual. O id é derivado dos dois uid ordenados,
 * então nunca existem duas conversas para o mesmo par. A criação usa transação
 * para não sobrescrever um documento existente.
 */
export async function getOrCreateDirectConversation(myUid: string, otherUid: string): Promise<string> {
  if (myUid === otherUid) throw new AppError('self-chat', 'Você não pode iniciar uma conversa consigo mesmo.');
  const conversationId = buildDirectConversationId(myUid, otherUid);
  const conversationRef = doc(firestore, 'directConversations', conversationId);

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (snapshot.exists()) return;
    const data: DirectConversationDocument = {
      type: 'direct',
      participantIds: sortedPair(myUid, otherUid),
      createdAt: Date.now(),
    };
    transaction.set(conversationRef, data);
  });

  // Espelho de participantes no RTDB, usado pelas regras de leitura/escrita das mensagens.
  // As regras só aceitam esta escrita se o id da conversa contiver os dois uid.
  await update(ref(realtimeDb, `conversations/${conversationId}/members`), {
    [myUid]: true,
    [otherUid]: true,
  });
  return conversationId;
}

export function observeMyDirectConversations(
  uid: string,
  onChange: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((d) => parseDirectConversation(d.id, d.data()))
          .filter((c): c is DirectConversation => c !== null),
      ),
    onError,
  );
}

/**
 * Escuta as mensagens da conversa em tempo real no Realtime Database.
 * Retorna a função que remove o listener — deve ser chamada ao desmontar a tela
 * ou ao trocar de conversa.
 */
export function subscribeToMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = rtdbQuery(
    ref(realtimeDb, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE_SIZE),
  );
  return onValue(
    messagesQuery,
    (snapshot: DataSnapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const parsed = child.key ? parseMessage(child.key, conversationId, child.val()) : null;
        if (parsed) list.push(parsed);
        return false;
      });
      onChange(list);
    },
    onError,
  );
}

/** Persiste a mensagem no Realtime Database e devolve o id gerado. */
export async function sendMessage(
  conversationId: string,
  conversationType: ConversationType,
  senderId: string,
  outgoing: OutgoingMessage,
): Promise<string> {
  const text = outgoing.text.trim();
  if (text.length === 0) throw new AppError('empty-message', 'Digite uma mensagem.');
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('message-too-long', `A mensagem pode ter até ${MAX_MESSAGE_LENGTH} caracteres.`);
  }
  const messageRef = push(ref(realtimeDb, `messages/${conversationId}`));
  if (!messageRef.key) throw new AppError('send-failed', 'Não foi possível gerar o id da mensagem.');

  const record = {
    conversationId,
    conversationType,
    senderId,
    text,
    target: outgoing.target,
    mentionedUserIds: outgoing.mentionedUserIds,
    createdAt: serverTimestamp(),
  };
  await set(messageRef, record);
  return messageRef.key;
}
