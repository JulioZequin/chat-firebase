import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { OfflineBanner } from '../components/OfflineBanner';
import { PhotoPicker } from '../components/PhotoPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { validateRegister, type RegisterValidationErrors } from '../services/authService';
import type { AuthScreenProps } from '../types/navigation';
import type { RegisterInput } from '../types/user';
import { colors, spacing } from '../theme';
import { toUserMessage } from '../utils/errors';
import { maskDate, maskPhone } from '../utils/validation';

const EMPTY_FORM: RegisterInput = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  birthDate: '',
  photoUri: null,
};

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterInput>(EMPTY_FORM);
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [errors, setErrors] = useState<RegisterValidationErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Atualização imutável do formulário.
  const setField = useCallback(<K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const validation = validateRegister(form, confirmPassword);
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;
    setLoading(true);
    setSubmitError(null);
    try {
      await register(form);
      // O AuthContext detecta a sessão e troca para as telas autenticadas.
    } catch (err) {
      setSubmitError(toUserMessage(err, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  }, [confirmPassword, form, register]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker localUri={form.photoUri} onPick={(uri) => setField('photoUri', uri)} error={errors.photoUri} />
        <TextField label="Nome" value={form.name} onChangeText={(v) => setField('name', v)} error={errors.name} autoComplete="name" placeholder="Seu nome completo" />
        <TextField label="E-mail" value={form.email} onChangeText={(v) => setField('email', v)} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="voce@email.com" />
        <TextField label="Celular" value={form.phoneNumber} onChangeText={(v) => setField('phoneNumber', maskPhone(v))} error={errors.phoneNumber} keyboardType="phone-pad" placeholder="(11) 91234-5678" />
        <TextField label="Data de nascimento" value={form.birthDate} onChangeText={(v) => setField('birthDate', maskDate(v))} error={errors.birthDate} keyboardType="number-pad" placeholder="DD/MM/AAAA" />
        <TextField label="Senha" value={form.password} onChangeText={(v) => setField('password', v)} error={errors.password} secureTextEntry autoComplete="new-password" hint="Mínimo de 6 caracteres" />
        <TextField
          label="Confirmar senha"
          value={confirmPassword}
          onChangeText={(v) => {
            setConfirmPassword(v);
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {submitError ? <ErrorMessage message={submitError} onDismiss={() => setSubmitError(null)} /> : null}
        <PrimaryButton title="Criar conta" onPress={handleSubmit} loading={loading} />
        <Text style={styles.back} onPress={() => navigation.goBack()} accessibilityRole="link">
          Já tenho conta
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
  back: { textAlign: 'center', color: colors.primary, fontWeight: '700', padding: spacing.sm },
});
