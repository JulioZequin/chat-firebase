import type { ChatGroup } from '../types/group';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 100;
export const MAX_GROUP_NAME = 60;

export type GroupValidationInput = {
  name: string;
  memberIds: readonly string[];
  memberLimit: number;
  ownerId: string;
  notificationPolicy: NotificationPolicy;
};

/** Valida as regras de grupo. Retorna uma mensagem de erro ou `null`. Mesmas regras das Security Rules. */
export function validateGroup(input: GroupValidationInput): string | null {
  const name = input.name.trim();
  if (name.length === 0) return 'Informe o nome do grupo.';
  if (name.length > MAX_GROUP_NAME) return `O nome deve ter até ${MAX_GROUP_NAME} caracteres.`;
  if (!Number.isInteger(input.memberLimit)) return 'O limite de integrantes deve ser um número inteiro.';
  if (input.memberLimit < MIN_GROUP_MEMBERS) return `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.`;
  if (input.memberLimit > MAX_GROUP_LIMIT) return `O limite máximo é ${MAX_GROUP_LIMIT} integrantes.`;
  if (!input.memberIds.includes(input.ownerId)) return 'O proprietário precisa fazer parte do grupo.';
  if (new Set(input.memberIds).size !== input.memberIds.length) return 'Há integrantes repetidos.';
  if (input.memberIds.length < MIN_GROUP_MEMBERS) return 'Selecione pelo menos mais um integrante.';
  if (input.memberIds.length > input.memberLimit) {
    return `O grupo tem ${input.memberIds.length} integrantes; o limite não pode ser menor que isso.`;
  }
  if (!NOTIFICATION_POLICIES.includes(input.notificationPolicy)) return 'Política de notificação inválida.';
  return null;
}

/** Converte o texto do campo de limite em inteiro (NaN se inválido). */
export function parseMemberLimit(text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
}

export function availableSlots(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): number {
  return Math.max(0, group.memberLimit - group.memberIds.length);
}

export function isGroupFull(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): boolean {
  return availableSlots(group) === 0;
}

export const POLICY_LABELS: Record<NotificationPolicy, { title: string; description: string }> = {
  all_group_messages: {
    title: 'Todas as mensagens',
    description: 'Todos os integrantes, exceto o remetente, recebem push.',
  },
  mentioned_members: {
    title: 'Somente mencionados',
    description: 'Apenas quem for mencionado ou selecionado como destinatário recebe push.',
  },
  direct_messages_only: {
    title: 'Somente conversas individuais',
    description: 'Mensagens deste grupo não geram push.',
  },
  disabled: {
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
};
