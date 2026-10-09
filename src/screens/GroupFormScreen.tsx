import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector } from '../components/PolicySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup, useGroupActions } from '../hooks/useGroups';
import { useUserDirectory } from '../hooks/useUserDirectory';
import type { AppScreenProps } from '../types/navigation';
import type { NotificationPolicy } from '../types/notification';
import { colors, radius, spacing } from '../theme';
import { MAX_GROUP_LIMIT, parseMemberLimit, POLICY_LABELS, validateGroup } from '../utils/groupValidation';

const DEFAULT_LIMIT = 10;

export function GroupFormScreen({ navigation, route }: AppScreenProps<'GroupForm'>) {
  const uid = useCurrentUid();
  const groupId = route.params.groupId;
  const isEdit = groupId !== null;
  const { group, loading, removed } = useGroup(groupId);
  const directory = useUserDirectory();
  const actions = useGroupActions(uid);

  const [initialized, setInitialized] = useState<boolean>(!isEdit);
  const [name, setName] = useState<string>('');
  const [limitText, setLimitText] = useState<string>(String(DEFAULT_LIMIT));
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  /** Integrantes além do proprietário. */
  const [otherMemberIds, setOtherMemberIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const ownerId = isEdit ? (group?.ownerId ?? '') : uid;
  const isOwner = ownerId === uid;

  // Preenche o formulário uma única vez com os dados do grupo (edição).
  useEffect(() => {
    if (!isEdit || initialized || !group) return;
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
    setOtherMemberIds(group.memberIds.filter((id) => id !== group.ownerId));
    setInitialized(true);
  }, [group, initialized, isEdit]);

  // Recebe a seleção feita na Tela de Usuários.
  useEffect(() => {
    if (route.params.selectedIds) setOtherMemberIds(route.params.selectedIds.filter((id) => id !== ownerId));
  }, [ownerId, route.params.selectedIds]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? (isOwner ? 'Editar grupo' : 'Detalhes do grupo') : 'Novo grupo' });
  }, [isEdit, isOwner, navigation]);

  const memberLimit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const totalMembers = otherMemberIds.length + 1;
  const slots = Number.isNaN(memberLimit) ? 0 : Math.max(0, memberLimit - totalMembers);
  const allMemberIds = useMemo(() => [ownerId, ...otherMemberIds], [ownerId, otherMemberIds]);

  const validation = useMemo(
    () =>
      validateGroup({ name, memberIds: allMemberIds, memberLimit, ownerId, notificationPolicy: policy }),
    [allMemberIds, memberLimit, name, ownerId, policy],
  );

  const openMemberSelection = useCallback(() => {
    if (Number.isNaN(memberLimit) || memberLimit < 2) {
      setFormError('Defina um limite válido antes de escolher os integrantes.');
      return;
    }
    navigation.navigate('Users', {
      mode: 'select-members',
      groupId,
      selectedIds: otherMemberIds,
      memberLimit,
    });
  }, [groupId, memberLimit, navigation, otherMemberIds]);

  const removeLocal = useCallback((memberId: string) => {
    setOtherMemberIds((prev) => prev.filter((id) => id !== memberId));
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    if (validation) {
      setFormError(validation);
      return;
    }
    if (!isEdit) {
      const createdId = await actions.createGroup({
        name,
        memberIds: allMemberIds,
        memberLimit,
        notificationPolicy: policy,
        photoUri,
      });
      if (createdId) navigation.replace('Chat', { conversationId: createdId, conversationType: 'group' });
      return;
    }
    if (!groupId) return;
    const ok = await actions.updateGroup(groupId, {
      name,
      memberLimit,
      notificationPolicy: policy,
      memberIds: allMemberIds,
      photoUri,
    });
    if (ok) navigation.goBack();
  }, [actions, allMemberIds, groupId, isEdit, memberLimit, name, navigation, photoUri, policy, validation]);

  const handleLeave = useCallback(() => {
    if (!groupId) return;
    Alert.alert('Sair do grupo', 'Você deixará de ver e enviar mensagens deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          const ok = await actions.leaveGroup(groupId);
          if (ok) navigation.popToTop();
        },
      },
    ]);
  }, [actions, groupId, navigation]);

  if (isEdit && loading) return <Loading message="Carregando grupo..." />;
  if (isEdit && (removed || !group)) {
    return <EmptyState title="Grupo indisponível" description="Você não participa mais deste grupo ou ele foi excluído." />;
  }
  if (!initialized) return <Loading />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {isOwner ? (
          <PhotoPicker localUri={photoUri} currentUrl={group?.photoUrl} onPick={setPhotoUri} variant="group" />
        ) : null}

        <TextField label="Nome do grupo" value={name} onChangeText={setName} editable={isOwner} maxLength={60} placeholder="Ex.: Turma de Mobile" />

        <TextField
          label="Limite de integrantes (inclui o proprietário)"
          value={limitText}
          onChangeText={(v) => setLimitText(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          editable={isOwner}
          hint={`Entre 2 e ${MAX_GROUP_LIMIT}. Não pode ser menor que a quantidade atual.`}
        />

        <View style={[styles.capacity, slots === 0 && styles.capacityFull]}>
          <Text style={styles.capacityTitle}>
            {totalMembers}/{Number.isNaN(memberLimit) ? '?' : memberLimit} integrantes
          </Text>
          <Text style={[styles.capacityText, slots === 0 && styles.capacityTextFull]}>
            {slots > 0 ? `${slots} vaga(s) disponível(is)` : 'Grupo sem vagas'}
          </Text>
        </View>

        <Text style={styles.section}>Integrantes</Text>
        <View style={styles.card}>
          {allMemberIds.map((memberId) => (
            <GroupMemberItem
              key={memberId}
              uid={memberId}
              user={directory.byId.get(memberId)}
              isOwner={memberId === ownerId}
              isMe={memberId === uid}
              onPress={memberId === uid ? undefined : (id) => navigation.navigate('Profile', { uid: id })}
              onRemove={isOwner ? removeLocal : undefined}
            />
          ))}
        </View>
        {isOwner ? (
          <PrimaryButton
            title={slots > 0 ? 'Adicionar / alterar integrantes' : 'Alterar integrantes (grupo sem vagas)'}
            onPress={openMemberSelection}
            variant="outline"
          />
        ) : null}

        <Text style={styles.section}>Notificações push</Text>
        {isOwner ? (
          <PolicySelector value={policy} onChange={setPolicy} />
        ) : (
          <Text style={styles.readonly}>{POLICY_LABELS[policy].title} — {POLICY_LABELS[policy].description}</Text>
        )}

        {formError ? <ErrorMessage message={formError} onDismiss={() => setFormError(null)} /> : null}
        {actions.error ? <ErrorMessage message={actions.error} onDismiss={actions.clearError} /> : null}

        {isOwner ? (
          <PrimaryButton title={isEdit ? 'Salvar alterações' : 'Criar grupo'} onPress={handleSave} loading={actions.saving} />
        ) : (
          <PrimaryButton title="Sair do grupo" onPress={handleLeave} variant="danger" loading={actions.saving} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  capacity: { borderRadius: radius.md, backgroundColor: colors.mention, padding: spacing.md, gap: 2 },
  capacityFull: { backgroundColor: colors.dangerSoft },
  capacityTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  capacityText: { color: colors.primaryDark, fontWeight: '600' },
  capacityTextFull: { color: colors.danger },
  section: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  readonly: { color: colors.text, fontSize: 15 },
});
