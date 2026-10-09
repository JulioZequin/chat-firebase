import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import { POLICY_LABELS } from '../utils/groupValidation';
import { colors, radius, spacing } from '../theme';

type Props = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: Props) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const selected = policy === value;
        return (
          <Pressable
            key={policy}
            onPress={() => onChange(policy)}
            disabled={disabled}
            style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
          >
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View style={styles.texts}>
              <Text style={styles.title}>{POLICY_LABELS[policy].title}</Text>
              <Text style={styles.description}>{POLICY_LABELS[policy].description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  option: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.mention },
  disabled: { opacity: 0.6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  description: { fontSize: 13, color: colors.textMuted },
});
