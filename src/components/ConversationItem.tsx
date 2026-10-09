import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConversationSummary } from '../types/chat';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  item: ConversationSummary;
  otherUser: PublicUser | undefined;
  onPress: (item: ConversationSummary) => void;
};

function ConversationItemComponent({ item, otherUser, onPress }: Props) {
  const isGroup = item.kind === 'group';
  const title = isGroup ? item.group.name : (otherUser?.name ?? 'Usuário');
  const subtitle = isGroup
    ? `${item.group.memberIds.length}/${item.group.memberLimit} integrantes`
    : 'Conversa individual';

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa com'} ${title}`}
    >
      <Avatar uri={isGroup ? item.group.photoUrl : otherUser?.photoUrl} variant={isGroup ? 'group' : 'user'} size={50} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, isGroup ? styles.badgeGroup : styles.badgeDirect]}>
        <Text style={[styles.badgeText, isGroup ? styles.badgeTextGroup : styles.badgeTextDirect]}>
          {isGroup ? 'GRUPO' : 'DIRETA'}
        </Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeGroup: { backgroundColor: colors.primary },
  badgeDirect: { backgroundColor: colors.primarySoft },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  badgeTextGroup: { color: '#fff' },
  badgeTextDirect: { color: colors.primaryDark },
});
