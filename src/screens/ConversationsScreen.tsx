import { useCallback, useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { NotificationStatusBanner } from '../components/NotificationStatusBanner';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth, useCurrentUid } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useUserDirectory } from '../hooks/useUserDirectory';
import type { ConversationSummary } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius, spacing } from '../theme';
import { toUserMessage } from '../utils/errors';

export function ConversationsScreen({ navigation }: AppScreenProps<'Conversations'>) {
  const uid = useCurrentUid();
  const { profile, logout } = useAuth();
  const { conversations, loading, error } = useConversations(uid);
  const directory = useUserDirectory();

  const confirmLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout().catch((err: unknown) => Alert.alert('Erro', toUserMessage(err, 'Não foi possível sair.')));
        },
      },
    ]);
  }, [logout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.navigate('Profile', { uid })} accessibilityLabel="Meu perfil" hitSlop={8}>
          <Avatar uri={profile?.photoUrl} size={32} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={confirmLogout} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.headerAction}>Sair</Text>
        </Pressable>
      ),
    });
  }, [confirmLogout, navigation, profile?.photoUrl, uid]);

  const openConversation = useCallback(
    (item: ConversationSummary) => {
      if (item.kind === 'group') {
        navigation.navigate('Chat', { conversationId: item.group.id, conversationType: 'group' });
      } else {
        navigation.navigate('Chat', { conversationId: item.conversation.id, conversationType: 'direct' });
      }
    },
    [navigation],
  );

  const keyExtractor = useCallback(
    (item: ConversationSummary) => (item.kind === 'group' ? item.group.id : item.conversation.id),
    [],
  );

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.banners}>
        <NotificationStatusBanner />
        {error ? <ErrorMessage message={error} /> : null}
      </View>
      {loading ? (
        <Loading message="Carregando conversas..." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              otherUser={item.kind === 'direct' ? directory.byId.get(item.otherUserId) : undefined}
              onPress={openConversation}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Comece uma conversa individual ou crie um grupo usando os botões abaixo."
            />
          }
        />
      )}
      <View style={styles.actions}>
        <Pressable style={[styles.fab, styles.fabOutline]} onPress={() => navigation.navigate('Users', { mode: 'direct' })} accessibilityRole="button">
          <Text style={[styles.fabText, styles.fabTextOutline]}>Nova conversa</Text>
        </Pressable>
        <Pressable style={styles.fab} onPress={() => navigation.navigate('GroupForm', { groupId: null })} accessibilityRole="button">
          <Text style={styles.fabText}>Novo grupo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banners: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  headerAction: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 78 },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flexGrow: 1 },
  actions: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: spacing.md },
  fab: { flex: 1, minHeight: 50, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fabTextOutline: { color: colors.primary },
});
