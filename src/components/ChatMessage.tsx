import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage as ChatMessageModel } from '../types/chat';
import { colors, radius, spacing } from '../theme';
import { formatTime } from '../utils/format';

type Props = {
  message: ChatMessageModel;
  isMine: boolean;
  showAuthor: boolean;
  authorName: string;
  /** Nome do integrante para quem a mensagem foi direcionada (grupo). */
  targetName: string | null;
  mentionNames: string[];
  mentionsMe: boolean;
};

function ChatMessageComponent({ message, isMine, showAuthor, authorName, targetName, mentionNames, mentionsMe }: Props) {
  const directedLabel = targetName
    ? `Para ${targetName}`
    : mentionNames.length > 0
      ? `Menciona ${mentionNames.join(', ')}`
      : null;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          mentionsMe && !isMine ? styles.bubbleMention : null,
        ]}
      >
        {showAuthor && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
        {directedLabel ? (
          <Text style={[styles.directed, isMine ? styles.directedMine : null]}>@ {directedLabel}</Text>
        ) : null}
        <Text style={[styles.text, isMine ? styles.textMine : null]}>{message.text}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : null]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  bubbleMention: { backgroundColor: colors.mention, borderColor: colors.primary },
  author: { fontSize: 12, fontWeight: '800', color: colors.primary },
  directed: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  directedMine: { color: '#D1F0EB' },
  text: { fontSize: 16, color: colors.text, lineHeight: 21 },
  textMine: { color: '#fff' },
  time: { fontSize: 11, color: colors.textMuted, alignSelf: 'flex-end' },
  timeMine: { color: '#CDE9E5' },
});
