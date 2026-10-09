import { StyleSheet, Text, View } from 'react-native';
import { useConnectivity } from '../hooks/useConnectivity';
import { colors, spacing } from '../theme';

export function OfflineBanner() {
  const online = useConnectivity();
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>Sem conexão. As mensagens serão sincronizadas quando a internet voltar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.warningSoft, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  text: { color: colors.warning, fontSize: 13, textAlign: 'center' },
});
