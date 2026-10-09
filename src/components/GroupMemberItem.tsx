import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  uid: string;
  user: PublicUser | undefined;
  isOwner: boolean;
  isMe: boolean;
  onPress?: (uid: string) => void;
  onRemove?: (uid: string) => void;
};

function GroupMemberItemComponent({ uid, user, isOwner, isMe, onPress, onRemove }: Props) {
  return (
    <Pressable
      onPress={onPress ? () => onPress(uid) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Avatar uri={user?.photoUrl} size={42} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name ?? 'Usuário indisponível'}
          {isMe ? ' (você)' : ''}
        </Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {onRemove && !isOwner ? (
        <Pressable onPress={() => onRemove(uid)} hitSlop={8} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remover ${user?.name ?? 'integrante'}`}>
          <Text style={styles.removeText}>Remover</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  owner: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  remove: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.danger, paddingHorizontal: spacing.md, paddingVertical: 4 },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
