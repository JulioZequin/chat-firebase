import { useEffect, useMemo, useState } from 'react';
import { observeMyDirectConversations } from '../services/chatService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import { toUserMessage } from '../utils/errors';
import { useMyGroups } from './useGroups';

type State = { conversations: ConversationSummary[]; loading: boolean; error: string | null };

/** Lista unificada de conversas individuais (Firestore) e grupos (Firestore). */
export function useConversations(uid: string): State {
  const groupsState = useMyGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [directLoading, setDirectLoading] = useState<boolean>(true);
  const [directError, setDirectError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = observeMyDirectConversations(
      uid,
      (list) => {
        setDirects(list);
        setDirectLoading(false);
        setDirectError(null);
      },
      (err) => {
        setDirectError(toUserMessage(err, 'Não foi possível carregar as conversas.'));
        setDirectLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  // Estado derivado: combinado e ordenado sem mutar as listas de origem.
  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems: ConversationSummary[] = directs.map((conversation) => ({
      kind: 'direct',
      conversation,
      otherUserId: conversation.participants[0] === uid ? conversation.participants[1] : conversation.participants[0],
      sortKey: conversation.createdAt,
    }));
    const groupItems: ConversationSummary[] = groupsState.groups.map((group) => ({
      kind: 'group',
      group,
      sortKey: group.updatedAt,
    }));
    return [...directItems, ...groupItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [directs, groupsState.groups, uid]);

  return {
    conversations,
    loading: directLoading || groupsState.loading,
    error: directError ?? groupsState.error,
  };
}
