import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { UserListItem } from '../components/UserListItem';
import { useCurrentUid } from '../hooks/useAuth';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { getOrCreateDirectConversation } from '../services/chatService';
import type { AppScreenProps } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { toUserMessage } from '../utils/errors';

export function UsersScreen({ navigation, route }: AppScreenProps<'Users'>) {
  const uid = useCurrentUid();
  const params = route.params;
  const selecting = params.mode === 'select-members';
  const memberLimit = params.mode === 'select-members' ? params.memberLimit : 0;

  const { users, loading, error } = useUserDirectory();
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>(params.mode === 'select-members' ? params.selectedIds : []);
  const [opening, setOpening] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // O próprio usuário nunca aparece na lista (não pode conversar consigo mesmo).
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return users.filter((u) => u.uid !== uid && (term.length === 0 || u.nameLower.includes(term)));
  }, [search, uid, users]);

  // +1 = o proprietário, que já ocupa uma vaga.
  const remaining = selecting ? memberLimit - (selectedIds.length + 1) : 0;

  const done = useCallback(() => {
    if (params.mode !== 'select-members') return;
    navigation.popTo('GroupForm', { groupId: params.groupId, selectedIds }, { merge: true });
  }, [navigation, params, selectedIds]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selecting ? 'Selecionar integrantes' : 'Nova conversa',
      headerRight: selecting
        ? () => (
            <Pressable onPress={done} hitSlop={8} accessibilityRole="button">
              <Text style={styles.headerAction}>Concluir</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [done, navigation, selecting]);

  const handlePress = useCallback(
    async (user: PublicUser) => {
      setActionError(null);
      if (selecting) {
        if (selectedIds.includes(user.uid)) {
          setSelectedIds((prev) => prev.filter((id) => id !== user.uid));
        } else if (selectedIds.length + 1 >= memberLimit) {
          setActionError(`Grupo sem vagas: o limite é de ${memberLimit} integrantes (incluindo você).`);
        } else {
          setSelectedIds((prev) => [...prev, user.uid]);
        }
        return;
      }
      setOpening(user.uid);
      try {
        const conversationId = await getOrCreateDirectConversation(uid, user.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err) {
        setActionError(toUserMessage(err, 'Não foi possível abrir a conversa.'));
      } finally {
        setOpening(null);
      }
    },
    [memberLimit, navigation, selectedIds, selecting, uid],
  );

  if (loading) return <Loading message="Carregando usuários..." />;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          accessibilityLabel="Buscar usuários"
        />
        {selecting ? (
          <Text style={[styles.slots, remaining <= 0 && styles.slotsFull]}>
            {remaining > 0 ? `${remaining} vaga(s) disponível(is)` : 'Grupo sem vagas'} · {selectedIds.length + 1}/{memberLimit}
          </Text>
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
        {actionError ? <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} /> : null}
        {opening ? <Text style={styles.opening}>Abrindo conversa...</Text> : null}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.uid);
          return (
            <UserListItem
              user={item}
              onPress={handlePress}
              selectable={selecting}
              selected={selected}
              disabled={opening !== null || (selecting && !selected && remaining <= 0)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'Nenhum usuário encontrado' : 'Nenhum outro usuário cadastrado'}
            description={search ? 'Tente outro nome.' : 'Peça para alguém criar uma conta para conversar.'}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: { padding: spacing.md, gap: spacing.sm },
  search: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, fontSize: 16, color: colors.text },
  slots: { color: colors.primary, fontWeight: '700' },
  slotsFull: { color: colors.danger },
  opening: { color: colors.textMuted },
  headerAction: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  emptyContainer: { flexGrow: 1 },
});
