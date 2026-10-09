import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { NotificationStatusBanner } from '../components/NotificationStatusBanner';
import { useCurrentUid } from '../hooks/useAuth';
import { fetchProfile, observePreferences, setPushEnabled } from '../services/userService';
import type { AppScreenProps } from '../types/navigation';
import type { ChatUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { AppError, toUserMessage } from '../utils/errors';
import { formatBirthDate } from '../utils/validation';

type ProfileState =
  | { state: 'loading' }
  | { state: 'loaded'; profile: ChatUser }
  | { state: 'forbidden' }
  | { state: 'error'; message: string };

function Field({ label, value }: { label: string; value: string }) {
  const missing = value.trim().length === 0;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, missing && styles.fieldMissing]}>{missing ? 'Não informado' : value}</Text>
    </View>
  );
}

export function ProfileScreen({ navigation, route }: AppScreenProps<'Profile'>) {
  const { uid: profileUid } = route.params;
  const myUid = useCurrentUid();
  const isMe = profileUid === myUid;

  const [profileState, setProfileState] = useState<ProfileState>({ state: 'loading' });
  const [pushEnabled, setPushEnabledState] = useState<boolean>(true);
  const [prefError, setPrefError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isMe ? 'Meu perfil' : 'Perfil' });
  }, [isMe, navigation]);

  const load = useCallback(async () => {
    setProfileState({ state: 'loading' });
    try {
      // A API verifica se há conversa/grupo em comum antes de devolver os dados cadastrais.
      const profile = await fetchProfile(profileUid);
      setProfileState({ state: 'loaded', profile });
    } catch (err) {
      if (err instanceof AppError && err.code === 'forbidden') setProfileState({ state: 'forbidden' });
      else setProfileState({ state: 'error', message: toUserMessage(err, 'Não foi possível carregar o perfil.') });
    }
  }, [profileUid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isMe) return undefined;
    return observePreferences(
      myUid,
      (prefs) => setPushEnabledState(prefs.pushEnabled),
      (err) => setPrefError(toUserMessage(err)),
    );
  }, [isMe, myUid]);

  const togglePush = useCallback(
    async (value: boolean) => {
      setPushEnabledState(value);
      try {
        await setPushEnabled(myUid, value);
        setPrefError(null);
      } catch (err) {
        setPushEnabledState(!value);
        setPrefError(toUserMessage(err, 'Não foi possível salvar a preferência.'));
      }
    },
    [myUid],
  );

  if (profileState.state === 'loading') return <Loading message="Carregando perfil..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {profileState.state === 'forbidden' ? (
        <ErrorMessage message="Você só pode ver o perfil de quem compartilha uma conversa individual ou um grupo com você." />
      ) : null}
      {profileState.state === 'error' ? <ErrorMessage message={profileState.message} onRetry={load} /> : null}

      {profileState.state === 'loaded' ? (
        <>
          <View style={styles.header}>
            <Avatar uri={profileState.profile.photoUrl} size={120} />
            <Text style={styles.name}>{profileState.profile.name || 'Nome não informado'}</Text>
          </View>
          <View style={styles.card}>
            <Field label="E-mail" value={profileState.profile.email} />
            <Field label="Celular" value={profileState.profile.phoneNumber} />
            <Field
              label="Data de nascimento"
              value={profileState.profile.birthDate ? formatBirthDate(profileState.profile.birthDate) : ''}
            />
          </View>
        </>
      ) : null}

      {isMe ? (
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTexts}>
              <Text style={styles.fieldValue}>Receber notificações push</Text>
              <Text style={styles.fieldLabel}>Vale para todas as conversas neste perfil.</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={togglePush} trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
          {prefError ? <ErrorMessage message={prefError} /> : null}
          <NotificationStatusBanner />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  field: { gap: 2 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  fieldValue: { fontSize: 16, color: colors.text },
  fieldMissing: { color: colors.textMuted, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchTexts: { flex: 1, gap: 2 },
});
