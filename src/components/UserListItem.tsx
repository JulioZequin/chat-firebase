import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  user: PublicUser;
  onPress: (user: PublicUser) => void;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
};

function UserListItemComponent({ user, onPress, selectable = false, selected = false, disabled = false }: Props) {
  return (
    <Pressable
      onPress={() => onPress(user)}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected, disabled } : { disabled }}
    >
      <Avatar uri={user.photoUrl} size={44} />
      <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
      {selectable ? (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const UserListItem = memo(UserListItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.45 },
  name: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' },
  check: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '800' },
});
