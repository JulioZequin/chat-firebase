/**
 * Conversas individuais usam um id determinístico: `dm_<uidMenor>_<uidMaior>`.
 * Assim, o mesmo par de usuários sempre gera o mesmo id e é impossível existir
 * duas conversas individuais diferentes para eles. Os `uid` do Firebase Auth
 * não contêm "_", então o separador é seguro (as regras dependem disso).
 */
export const DIRECT_PREFIX = 'dm_';

export function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function buildDirectConversationId(a: string, b: string): string {
  if (a === b) {
    throw new Error('Não é possível criar uma conversa consigo mesmo.');
  }
  const [first, second] = sortedPair(a, b);
  return `${DIRECT_PREFIX}${first}_${second}`;
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.startsWith(DIRECT_PREFIX);
}

export function participantsFromDirectId(conversationId: string): [string, string] | null {
  if (!isDirectConversationId(conversationId)) return null;
  const parts = conversationId.slice(DIRECT_PREFIX.length).split('_');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export function otherParticipant(conversationId: string, myUid: string): string | null {
  const pair = participantsFromDirectId(conversationId);
  if (!pair) return null;
  if (pair[0] === myUid) return pair[1];
  if (pair[1] === myUid) return pair[0];
  return null;
}
