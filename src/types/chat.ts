import type { ChatGroup } from './group';

export type ConversationType = 'direct' | 'group';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/**
 * Formato gravado no Realtime Database em `messages/{conversationId}/{messageId}`.
 * `createdAt` é gravado com o timestamp do servidor; listas vazias não existem no RTDB,
 * por isso `mentionedUserIds` é opcional na leitura.
 */
export type MessageRecord = Omit<ChatMessage, 'id' | 'mentionedUserIds'> & {
  mentionedUserIds?: string[];
};

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

/** Formato do documento `directConversations/{id}` no Firestore. */
export type DirectConversationDocument = {
  type: 'direct';
  participantIds: [string, string];
  createdAt: number;
};

export type ConversationSummary =
  | { kind: 'direct'; conversation: DirectConversation; otherUserId: string; sortKey: number }
  | { kind: 'group'; group: ChatGroup; sortKey: number };

export type OutgoingMessage = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type SendStatus =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'failed'; message: string; draft: OutgoingMessage }
  | { state: 'push-failed'; message: string };
