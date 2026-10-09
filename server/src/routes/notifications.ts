import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { claimDispatch, completeDispatch, failDispatch, getDispatchSummary } from '../services/dispatchGuard.js';
import { firebase } from '../services/firebaseAdmin.js';
import { sendPush } from '../services/notificationSender.js';
import {
  conversationTypeFromId,
  isValidId,
  loadConversation,
  loadMessage,
  resolveRecipients,
} from '../services/recipientResolver.js';
import type { ConversationContext, PushContent, StoredMessage } from '../types.js';

export const notificationsRouter = Router();

async function senderName(uid: string): Promise<string> {
  const snap = await firebase().firestore.collection('users').doc(uid).get();
  const name: unknown = snap.get('name');
  return typeof name === 'string' && name.trim() ? name.trim() : 'Alguém';
}

/** Texto do push sem o conteúdo da mensagem (evita expor informação sensível). */
function buildContent(context: ConversationContext, message: StoredMessage, from: string, recipient: 'mention' | 'general'): PushContent {
  const data = { conversationId: message.conversationId, conversationType: context.type, messageId: message.id };
  if (context.type === 'direct') return { title: from, body: 'Enviou uma nova mensagem para você.', data };
  return {
    title: context.name,
    body: recipient === 'mention' ? `${from} mencionou você.` : `${from} enviou uma mensagem no grupo.`,
    data,
  };
}

/**
 * POST /notifications/messages
 * Body: { conversationId, messageId }
 * 1. valida o ID Token (middleware) 2. confere a mensagem no RTDB e o remetente
 * 3. lê participantes/política/tokens no Firestore 4. calcula destinatários no servidor
 * 5. envia por FCM/Expo 6. idempotente: reenvios da mesma mensagem não duplicam o push.
 */
notificationsRouter.post('/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body: unknown = req.body;
    const conversationId = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).conversationId : undefined;
    const messageId = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).messageId : undefined;
    if (!isValidId(conversationId) || !isValidId(messageId)) {
      throw new HttpError(400, 'invalid-body', 'Informe conversationId e messageId válidos.');
    }
    const uid = res.locals.uid;

    const message = await loadMessage(conversationId, messageId);
    if (!message) throw new HttpError(404, 'message-not-found', 'Mensagem não encontrada.');
    if (message.senderId !== uid) throw new HttpError(403, 'not-sender', 'Você não é o remetente desta mensagem.');
    if (message.conversationType !== conversationTypeFromId(conversationId)) {
      throw new HttpError(400, 'type-mismatch', 'Tipo de conversa inconsistente.');
    }

    const context = await loadConversation(conversationId);
    if (!context) throw new HttpError(404, 'conversation-not-found', 'Conversa não encontrada.');
    const recipients = resolveRecipients(context, message);

    if (!(await claimDispatch(conversationId, messageId, uid))) {
      const previous = await getDispatchSummary(conversationId, messageId);
      res.status(200).json({ duplicate: true, recipients: previous?.recipients ?? 0 });
      return;
    }

    try {
      const from = await senderName(uid);
      const mentioned = new Set([
        ...message.mentionedUserIds,
        ...(message.target.type === 'member' ? [message.target.memberId] : []),
      ]);
      const mentionRecipients = recipients.filter((id) => mentioned.has(id));
      const generalRecipients = recipients.filter((id) => !mentioned.has(id));

      const [a, b] = await Promise.all([
        mentionRecipients.length ? sendPush(mentionRecipients, buildContent(context, message, from, 'mention')) : null,
        generalRecipients.length ? sendPush(generalRecipients, buildContent(context, message, from, 'general')) : null,
      ]);
      const summary = {
        recipients: recipients.length,
        devices: (a?.devices ?? 0) + (b?.devices ?? 0),
        delivered: (a?.delivered ?? 0) + (b?.delivered ?? 0),
        failed: (a?.failed ?? 0) + (b?.failed ?? 0),
        invalidTokensDisabled: (a?.invalidTokensDisabled ?? 0) + (b?.invalidTokensDisabled ?? 0),
      };
      await completeDispatch(conversationId, messageId, summary);
      res.status(200).json({
        duplicate: false,
        policy: context.type === 'group' ? context.policy : 'direct',
        ...summary,
      });
    } catch (error) {
      await failDispatch(conversationId, messageId).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});
