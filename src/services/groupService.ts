import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatGroup, ChatGroupDocument, GroupFormInput } from '../types/group';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import { AppError } from '../utils/errors';
import { validateGroup } from '../utils/groupValidation';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import { uploadImage } from './storageService';

const groupsCollection = collection(firestore, 'groups');

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

export function parseGroup(id: string, data: DocumentData): ChatGroup {
  const memberIds: string[] = Array.isArray(data.memberIds)
    ? data.memberIds.filter((m: unknown): m is string => typeof m === 'string')
    : [];
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    memberIds,
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : memberIds.length,
    notificationPolicy: isPolicy(data.notificationPolicy) ? data.notificationPolicy : 'all_group_messages',
    policyUpdatedBy: typeof data.policyUpdatedBy === 'string' ? data.policyUpdatedBy : '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

/**
 * Pede à API que espelhe os integrantes do grupo (fonte da verdade: Firestore)
 * em `conversations/{groupId}/members` no Realtime Database. As regras do RTDB
 * usam esse espelho para liberar leitura/escrita de mensagens; só a API escreve nele.
 */
export function syncGroupMembership(groupId: string): Promise<void> {
  return apiRequest(`/groups/${encodeURIComponent(groupId)}/sync-members`, { method: 'POST' }, () => undefined);
}

async function syncAfterChange(groupId: string): Promise<void> {
  try {
    await syncGroupMembership(groupId);
  } catch (error) {
    throw new AppError(
      'membership-sync',
      error instanceof AppError
        ? `Grupo salvo, mas o acesso às mensagens não foi atualizado: ${error.message}`
        : 'Grupo salvo, mas o acesso às mensagens não foi atualizado. Tente salvar novamente.',
    );
  }
}

export async function createGroup(ownerId: string, input: GroupFormInput): Promise<string> {
  const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
  const validation = validateGroup({
    name: input.name,
    memberIds,
    memberLimit: input.memberLimit,
    ownerId,
    notificationPolicy: input.notificationPolicy,
  });
  if (validation) throw new AppError('invalid-group', validation);

  const groupRef = doc(groupsCollection);
  const now = Date.now();
  const data: ChatGroupDocument = {
    name: input.name.trim(),
    photoUrl: '',
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    policyUpdatedBy: ownerId,
    createdAt: now,
    updatedAt: now,
  };
  // As Security Rules validam proprietário, tamanho mínimo e limite na criação.
  await setDoc(groupRef, data);

  if (input.photoUri) {
    const photoUrl = await uploadImage(input.photoUri, { kind: 'group', groupId: groupRef.id });
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }
  await syncAfterChange(groupRef.id);
  return groupRef.id;
}

export type GroupPatch = {
  name?: string;
  memberLimit?: number;
  notificationPolicy?: NotificationPolicy;
  memberIds?: string[];
  photoUri?: string | null;
};

/**
 * Atualiza o grupo dentro de uma transação do Firestore. A transação relê o documento
 * no servidor; se outro cliente alterar o grupo ao mesmo tempo, ela é repetida com o
 * estado novo — então a validação do limite sempre usa a contagem real de integrantes.
 * As Security Rules repetem a validação (memberIds.size() <= memberLimit) no servidor.
 */
export async function updateGroup(groupId: string, actorId: string, patch: GroupPatch): Promise<void> {
  const groupRef = doc(groupsCollection, groupId);
  let membershipChanged = false;

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('not-found', 'Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId !== actorId) {
      throw new AppError('not-owner', 'Somente o proprietário pode alterar o grupo.');
    }

    const nextMembers = patch.memberIds
      ? Array.from(new Set([current.ownerId, ...patch.memberIds]))
      : current.memberIds;
    const nextLimit = patch.memberLimit ?? current.memberLimit;
    const nextPolicy = patch.notificationPolicy ?? current.notificationPolicy;
    const added = nextMembers.filter((id) => !current.memberIds.includes(id));

    if (added.length > 0 && nextMembers.length > nextLimit) {
      const slots = Math.max(0, nextLimit - current.memberIds.length);
      throw new AppError(
        'group-full',
        slots === 0
          ? 'Grupo sem vagas: o limite de integrantes foi atingido.'
          : `Só há ${slots} vaga(s) disponível(is) neste grupo.`,
      );
    }

    const validation = validateGroup({
      name: patch.name ?? current.name,
      memberIds: nextMembers,
      memberLimit: nextLimit,
      ownerId: current.ownerId,
      notificationPolicy: nextPolicy,
    });
    if (validation) throw new AppError('invalid-group', validation);

    membershipChanged =
      nextMembers.length !== current.memberIds.length ||
      nextMembers.some((id) => !current.memberIds.includes(id));

    const update: Partial<ChatGroupDocument> = {
      name: (patch.name ?? current.name).trim(),
      memberIds: nextMembers,
      memberLimit: nextLimit,
      notificationPolicy: nextPolicy,
      updatedAt: Date.now(),
    };
    if (nextPolicy !== current.notificationPolicy) update.policyUpdatedBy = actorId;
    transaction.update(groupRef, update);
  });

  if (patch.photoUri) {
    const photoUrl = await uploadImage(patch.photoUri, { kind: 'group', groupId });
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }
  if (membershipChanged) await syncAfterChange(groupId);
}

export function addMembers(groupId: string, actorId: string, current: ChatGroup, newIds: string[]): Promise<void> {
  return updateGroup(groupId, actorId, { memberIds: [...current.memberIds, ...newIds] });
}

export async function removeMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  const groupRef = doc(groupsCollection, groupId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('not-found', 'Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId !== actorId) throw new AppError('not-owner', 'Somente o proprietário pode remover integrantes.');
    if (memberId === current.ownerId) throw new AppError('owner-remove', 'O proprietário não pode ser removido.');
    const memberIds = current.memberIds.filter((id) => id !== memberId);
    if (memberIds.length < 2) throw new AppError('min-members', 'O grupo precisa ter pelo menos 2 integrantes.');
    transaction.update(groupRef, { memberIds, updatedAt: Date.now() });
  });
  await syncAfterChange(groupId);
}

/** Integrante (não proprietário) sai do grupo. As regras só permitem remover o próprio uid. */
export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const groupRef = doc(groupsCollection, groupId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('not-found', 'Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId === uid) throw new AppError('owner-leave', 'O proprietário não pode sair do próprio grupo.');
    transaction.update(groupRef, { memberIds: current.memberIds.filter((id) => id !== uid) });
  });
  await syncAfterChange(groupId);
}

export function observeMyGroups(
  uid: string,
  onChange: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(groupsCollection, where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => onChange(snapshot.docs.map((d) => parseGroup(d.id, d.data()))), onError);
}

export function observeGroup(
  groupId: string,
  onChange: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(groupsCollection, groupId),
    (snapshot) => onChange(snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null),
    onError,
  );
}
