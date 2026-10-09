import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendMessage, subscribeToMessages } from '../services/chatService';
import { requestMessagePush } from '../services/notificationService';
import type { ChatMessage, ConversationType, OutgoingMessage, SendStatus } from '../types/chat';
import { isPermissionDenied, toUserMessage } from '../utils/errors';

type ChatState = {
  messages: ChatMessage[];
  /** Mensagens em ordem decrescente — usadas na FlatList invertida. */
  messagesNewestFirst: ChatMessage[];
  loading: boolean;
  error: string | null;
  accessLost: boolean;
  sendStatus: SendStatus;
  send: (message: OutgoingMessage) => Promise<boolean>;
  retry: () => Promise<boolean>;
  dismissStatus: () => void;
};

export function useChat(conversationId: string, conversationType: ConversationType, uid: string): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState<boolean>(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>({ state: 'idle' });

  // Listener em tempo real; o cleanup remove o listener ao sair da tela ou trocar de conversa.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setError(null);
    setAccessLost(false);
    const unsubscribe = subscribeToMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (isPermissionDenied(err)) {
          setAccessLost(true);
          setError('Você não tem mais acesso a esta conversa.');
        } else {
          setError(toUserMessage(err, 'Não foi possível carregar as mensagens.'));
        }
      },
    );
    return unsubscribe;
  }, [conversationId]);

  const messagesNewestFirst = useMemo(() => [...messages].reverse(), [messages]);

  const send = useCallback(
    async (draft: OutgoingMessage): Promise<boolean> => {
      setSendStatus({ state: 'sending' });
      let messageId: string;
      try {
        messageId = await sendMessage(conversationId, conversationType, uid, draft);
      } catch (err) {
        setSendStatus({ state: 'failed', message: toUserMessage(err, 'Falha ao enviar a mensagem.'), draft });
        return false;
      }
      // Mensagem já persistida; o push é solicitado à API sem bloquear a conversa.
      setSendStatus({ state: 'idle' });
      requestMessagePush(conversationId, messageId).catch((err: unknown) => {
        setSendStatus({
          state: 'push-failed',
          message: `Mensagem enviada, mas a notificação falhou: ${toUserMessage(err, 'erro no servidor.')}`,
        });
      });
      return true;
    },
    [conversationId, conversationType, uid],
  );

  const retry = useCallback(async (): Promise<boolean> => {
    if (sendStatus.state !== 'failed') return false;
    return send(sendStatus.draft);
  }, [send, sendStatus]);

  const dismissStatus = useCallback(() => setSendStatus({ state: 'idle' }), []);

  return { messages, messagesNewestFirst, loading, error, accessLost, sendStatus, send, retry, dismissStatus };
}
