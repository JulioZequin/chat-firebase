import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConversationContext, NotificationPolicy } from '../types.js';
import { resolveRecipients } from './recipientResolver.js';

const group = (policy: NotificationPolicy): ConversationContext => ({
  type: 'group',
  id: 'g1',
  name: 'Turma',
  ownerId: 'ana',
  memberIds: ['ana', 'bia', 'caio', 'davi'],
  policy,
});

const general = { senderId: 'ana', target: { type: 'conversation' } as const, mentionedUserIds: [] };
const toBia = { senderId: 'ana', target: { type: 'member', memberId: 'bia' } as const, mentionedUserIds: ['bia'] };

describe('resolveRecipients', () => {
  it('conversa individual: só o outro participante', () => {
    const ctx: ConversationContext = { type: 'direct', id: 'dm_ana_bia', participantIds: ['ana', 'bia'] };
    assert.deepEqual(resolveRecipients(ctx, { ...general }), ['bia']);
  });

  it('all_group_messages: todos menos o remetente', () => {
    assert.deepEqual(resolveRecipients(group('all_group_messages'), general), ['bia', 'caio', 'davi']);
  });

  it('mentioned_members: só mencionados/selecionados', () => {
    assert.deepEqual(resolveRecipients(group('mentioned_members'), toBia), ['bia']);
    assert.deepEqual(resolveRecipients(group('mentioned_members'), general), []);
  });

  it('mentioned_members: ignora mencionados que não são integrantes e o próprio remetente', () => {
    const msg = { senderId: 'ana', target: { type: 'conversation' } as const, mentionedUserIds: ['ana', 'intruso', 'caio'] };
    assert.deepEqual(resolveRecipients(group('mentioned_members'), msg), ['caio']);
  });

  it('direct_messages_only e disabled: grupo não gera push', () => {
    assert.deepEqual(resolveRecipients(group('direct_messages_only'), toBia), []);
    assert.deepEqual(resolveRecipients(group('disabled'), toBia), []);
  });

  it('remetente que não participa é rejeitado', () => {
    assert.throws(() => resolveRecipients(group('all_group_messages'), { ...general, senderId: 'zeca' }));
  });
});
