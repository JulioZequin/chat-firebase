import { FieldValue } from 'firebase-admin/firestore';
import type { SendSummary } from '../types.js';
import { firebase } from './firebaseAdmin.js';

/**
 * Proteção contra chamadas duplicadas (idempotência).
 * Cada mensagem tem um documento `notificationDispatches/{conversationId}__{messageId}`.
 * A transação do Firestore serializa requisições concorrentes: apenas a primeira
 * "reivindica" o envio; reenvios recebem `duplicate`. Se o envio falhar por erro
 * interno, o status vira `failed` e uma nova tentativa é permitida.
 * A coleção é bloqueada para clientes nas Security Rules.
 */
function dispatchRef(conversationId: string, messageId: string) {
  return firebase().firestore.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);
}

export async function claimDispatch(conversationId: string, messageId: string, senderId: string): Promise<boolean> {
  const ref = dispatchRef(conversationId, messageId);
  return firebase().firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.get('status') !== 'failed') return false;
    transaction.set(ref, {
      conversationId,
      messageId,
      senderId,
      status: 'processing',
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

export async function completeDispatch(conversationId: string, messageId: string, summary: SendSummary): Promise<void> {
  await dispatchRef(conversationId, messageId).set(
    { status: 'sent', summary, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function failDispatch(conversationId: string, messageId: string): Promise<void> {
  await dispatchRef(conversationId, messageId).set(
    { status: 'failed', updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function getDispatchSummary(conversationId: string, messageId: string): Promise<SendSummary | null> {
  const snapshot = await dispatchRef(conversationId, messageId).get();
  const summary: unknown = snapshot.get('summary');
  if (typeof summary !== 'object' || summary === null) return null;
  const s = summary as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' ? v : 0);
  return {
    recipients: n(s.recipients),
    devices: n(s.devices),
    delivered: n(s.delivered),
    failed: n(s.failed),
    invalidTokensDisabled: n(s.invalidTokensDisabled),
  };
}
