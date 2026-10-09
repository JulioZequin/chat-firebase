import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'danger';
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'solid' }: Props) {
  const inactive = disabled || loading;
  const solid = variant === 'solid';
  const danger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        solid && styles.solid,
        variant === 'outline' && styles.outline,
        danger && styles.danger,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.text, { color: solid ? '#fff' : danger ? colors.danger : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  danger: { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.surface },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontSize: 16, fontWeight: '700' },
});
