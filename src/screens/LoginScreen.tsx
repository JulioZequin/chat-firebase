import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import type { AuthScreenProps } from '../types/navigation';
import { colors, spacing } from '../theme';
import { toUserMessage } from '../utils/errors';
import { isValidEmail } from '../utils/validation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => isValidEmail(email) && password.length > 0, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!canSubmit) {
      setError('Informe um e-mail válido e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(toUserMessage(err, 'Não foi possível entrar.'));
      setLoading(false);
    }
  }, [canSubmit, email, login, password]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>ChatFire</Text>
          <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>
        </View>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@email.com"
          textContentType="emailAddress"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="Sua senha"
          onSubmitEditing={handleLogin}
        />
        {error ? <ErrorMessage message={error} onDismiss={() => setError(null)} /> : null}
        <PrimaryButton title="Entrar" onPress={handleLogin} loading={loading} />
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.link} accessibilityRole="link">
          <Text style={styles.linkText}>Não tem conta? <Text style={styles.linkStrong}>Criar conta</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.xs },
  brand: { fontSize: 34, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textMuted },
  link: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.textMuted, fontSize: 15 },
  linkStrong: { color: colors.primary, fontWeight: '700' },
});
