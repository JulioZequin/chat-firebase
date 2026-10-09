import { firebase } from './firebaseAdmin.js';

/**
 * Espelha os integrantes do grupo (Firestore = fonte da verdade) em
 * `conversations/{groupId}/members` no Realtime Database.
 * As regras do RTDB usam esse nó para permitir ler/enviar mensagens, então um
 * integrante removido perde o acesso às mensagens assim que o espelho é atualizado
 * (o próprio Firebase cancela os listeners abertos dele).
 * Clientes não podem escrever nesse nó para grupos — só esta API (Admin SDK).
 */
export async function syncGroupMembers(groupId: string): Promise<{ members: number; deleted: boolean }> {
  const { firestore, database } = firebase();
  const snapshot = await firestore.collection('groups').doc(groupId).get();
  const membersRef = database.ref(`conversations/${groupId}/members`);
  if (!snapshot.exists) {
    await membersRef.remove();
    return { members: 0, deleted: true };
  }
  const memberIds: unknown = snapshot.get('memberIds');
  const ids = Array.isArray(memberIds) ? memberIds.filter((m): m is string => typeof m === 'string') : [];
  const mirror: Record<string, true> = {};
  for (const id of ids) mirror[id] = true;
  await membersRef.set(mirror);
  return { members: ids.length, deleted: false };
}
