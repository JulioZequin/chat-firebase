import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  tone?: 'error' | 'warning';
};

export function ErrorMessage({ message, onRetry, onDismiss, tone = 'error' }: Props) {
  const isError = tone === 'error';
  return (
    <View
      style={[styles.box, { backgroundColor: isError ? colors.dangerSoft : colors.warningSoft }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: isError ? colors.danger : colors.warning }]}>{message}</Text>
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable onPress={onRetry} hitSlop={8}>
            <Text style={styles.action}>Tentar novamente</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={styles.action}>Fechar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  text: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.lg },
  action: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
