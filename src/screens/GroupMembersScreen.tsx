import { useCallback, useLayoutEffect } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup, useGroupActions } from '../hooks/useGroups';
import { useUserDirectory } from '../hooks/useUserDirectory';
import type { AppScreenProps } from '../types/navigation';
import { colors, spacing } from '../theme';
import { availableSlots, POLICY_LABELS } from '../utils/groupValidation';

export function GroupMembersScreen({ navigation, route }: AppScreenProps<'GroupMembers'>) {
  const { groupId } = route.params;
  const uid = useCurrentUid();
  const { group, loading, removed } = useGroup(groupId);
  const directory = useUserDirectory();
  const actions = useGroupActions(uid);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Integrantes' });
  }, [navigation]);

  const openProfile = useCallback((memberId: string) => navigation.navigate('Profile', { uid: memberId }), [navigation]);

  const confirmRemove = useCallback(
    (memberId: string) => {
      const name = directory.byId.get(memberId)?.name ?? 'este integrante';
      Alert.alert('Remover integrante', `Remover ${name} do grupo? Ele não verá novas mensagens.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => actions.removeMember(groupId, memberId) },
      ]);
    },
    [actions, directory.byId, groupId],
  );

  if (loading) return <Loading />;
  if (removed || !group) return <EmptyState title="Grupo indisponível" description="Você não participa mais deste grupo." />;

  const isOwner = group.ownerId === uid;
  const slots = availableSlots(group);

  return (
    <FlatList
      style={styles.container}
      data={group.memberIds}
      keyExtractor={(id) => id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Avatar uri={group.photoUrl} size={110} variant="group" />
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.meta}>
            {group.memberIds.length}/{group.memberLimit} integrantes · {slots > 0 ? `${slots} vaga(s)` : 'sem vagas'}
          </Text>
          <Text style={styles.meta}>Push: {POLICY_LABELS[group.notificationPolicy].title}</Text>
          {actions.error ? <ErrorMessage message={actions.error} onDismiss={actions.clearError} /> : null}
          {isOwner ? (
            <View style={styles.manage}>
              <PrimaryButton title="Gerenciar grupo" variant="outline" onPress={() => navigation.navigate('GroupForm', { groupId })} />
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <GroupMemberItem
          uid={item}
          user={directory.byId.get(item)}
          isOwner={item === group.ownerId}
          isMe={item === uid}
          onPress={openProfile}
          onRemove={isOwner && item !== uid ? confirmRemove : undefined}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.xl, gap: spacing.xs },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 14 },
  manage: { alignSelf: 'stretch', marginTop: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 70 },
});
