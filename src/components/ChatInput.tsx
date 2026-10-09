import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_MESSAGE_LENGTH } from '../services/chatService';
import type { MessageTarget, OutgoingMessage } from '../types/chat';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { MentionPicker } from './MentionPicker';

type Props = {
  /** Integrantes que podem ser mencionados (vazio em conversa individual). */
  mentionableMembers: PublicUser[];
  disabled: boolean;
  sending: boolean;
  onSend: (message: OutgoingMessage) => Promise<boolean>;
};

export function ChatInput({ mentionableMembers, disabled, sending, onSend }: Props) {
  const [text, setText] = useState<string>('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const canMention = mentionableMembers.length > 0;
  const trimmed = text.trim();
  const canSend = !disabled && !sending && trimmed.length > 0;

  const mentionedUsers = useMemo(
    () => mentionableMembers.filter((m) => mentionIds.includes(m.uid)),
    [mentionableMembers, mentionIds],
  );

  const toggleMention = useCallback((uid: string) => {
    setMentionIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const target: MessageTarget =
      mentionIds.length === 1 ? { type: 'member', memberId: mentionIds[0] } : { type: 'conversation' };
    const ok = await onSend({ text: trimmed, target, mentionedUserIds: mentionIds });
    if (ok) {
      setText('');
      setMentionIds([]);
    }
  }, [canSend, mentionIds, onSend, trimmed]);

  return (
    <View style={styles.container}>
      {mentionedUsers.length > 0 ? (
        <View style={styles.chips}>
          <Text style={styles.chipsLabel}>{mentionedUsers.length === 1 ? 'Para:' : 'Mencionando:'}</Text>
          {mentionedUsers.map((u) => (
            <Pressable key={u.uid} onPress={() => toggleMention(u.uid)} style={styles.chip} accessibilityLabel={`Remover menção a ${u.name}`}>
              <Text style={styles.chipText}>@{u.name} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        {canMention ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={disabled}
            style={styles.mentionButton}
            accessibilityRole="button"
            accessibilityLabel="Mencionar integrante"
          >
            <Text style={styles.mentionText}>@</Text>
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Você não pode enviar mensagens aqui' : 'Mensagem'}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          style={styles.input}
          accessibilityLabel="Campo de mensagem"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Text style={styles.sendText}>{sending ? '...' : 'Enviar'}</Text>
        </Pressable>
      </View>
      <MentionPicker
        visible={pickerOpen}
        members={mentionableMembers}
        selectedIds={mentionIds}
        onToggle={toggleMention}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: spacing.sm, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  chipsLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  chip: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  chipText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  mentionButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  mentionText: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: radius.lg, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: colors.text },
  send: { height: 42, borderRadius: 21, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700' },
});
