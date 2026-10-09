import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { OfflineBanner } from '../components/OfflineBanner';
import { useCurrentUid } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { setActiveConversation } from '../services/notificationService';
import type { ChatMessage as ChatMessageModel } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import { colors, spacing } from '../theme';
import { otherParticipant } from '../utils/conversationId';

export function ChatScreen({ navigation, route }: AppScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const uid = useCurrentUid();
  const insets = useSafeAreaInsets();
  const isGroup = conversationType === 'group';

  const directory = useUserDirectory();
  const groupState = useGroup(isGroup ? conversationId : null);
  const chat = useChat(conversationId, conversationType, uid);

  const otherUid = useMemo(() => (isGroup ? null : otherParticipant(conversationId, uid)), [conversationId, isGroup, uid]);
  const otherUser = otherUid ? directory.byId.get(otherUid) : undefined;
  const group = groupState.group;

  const isMember = isGroup ? Boolean(group && group.memberIds.includes(uid)) : otherUid !== null;
  const blocked = chat.accessLost || (isGroup ? !groupState.loading && !isMember : !isMember);

  // Evita banner de push da própria conversa aberta e remove ao sair da tela.
  useFocusEffect(
    useCallback(() => {
      setActiveConversation(conversationId);
      return () => setActiveConversation(null);
    }, [conversationId]),
  );

  const openHeaderTarget = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [conversationId, isGroup, navigation, otherUid]);

  const title = isGroup ? (group?.name ?? 'Grupo') : (otherUser?.name ?? 'Conversa');
  const subtitle = isGroup && group ? `${group.memberIds.length} integrantes · toque para ver` : 'toque para ver o perfil';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={openHeaderTarget} style={styles.header} accessibilityRole="button" accessibilityLabel={`Abrir ${isGroup ? 'integrantes do grupo' : 'perfil'}`}>
          <Avatar uri={isGroup ? group?.photoUrl : otherUser?.photoUrl} size={34} variant={isGroup ? 'group' : 'user'} />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </Pressable>
      ),
      headerRight:
        isGroup && group && group.ownerId === uid
          ? () => (
              <Pressable onPress={() => navigation.navigate('GroupForm', { groupId: conversationId })} hitSlop={8} accessibilityRole="button">
                <Text style={styles.headerAction}>Editar</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [conversationId, group, isGroup, navigation, openHeaderTarget, otherUser?.photoUrl, subtitle, title, uid]);

  const mentionableMembers = useMemo(() => {
    if (!isGroup || !group) return [];
    return group.memberIds
      .filter((id) => id !== uid)
      .map((id) => directory.byId.get(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined);
  }, [directory.byId, group, isGroup, uid]);

  const nameOf = useCallback((id: string) => (id === uid ? 'você' : (directory.byId.get(id)?.name ?? 'Usuário')), [directory.byId, uid]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageModel }) => (
      <ChatMessage
        message={item}
        isMine={item.senderId === uid}
        showAuthor={isGroup}
        authorName={nameOf(item.senderId)}
        targetName={item.target.type === 'member' ? nameOf(item.target.memberId) : null}
        mentionNames={item.target.type === 'member' ? [] : item.mentionedUserIds.map(nameOf)}
        mentionsMe={item.mentionedUserIds.includes(uid) || (item.target.type === 'member' && item.target.memberId === uid)}
      />
    ),
    [isGroup, nameOf, uid],
  );

  const sendStatus = chat.sendStatus;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <OfflineBanner />
      {chat.loading ? (
        <Loading message="Carregando mensagens..." />
      ) : chat.error && !chat.accessLost ? (
        <View style={styles.padded}>
          <ErrorMessage message={chat.error} />
        </View>
      ) : (
        <FlatList
          data={chat.messagesNewestFirst}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          inverted={chat.messagesNewestFirst.length > 0}
          contentContainerStyle={chat.messagesNewestFirst.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <EmptyState
              title={blocked ? 'Conversa indisponível' : 'Nenhuma mensagem ainda'}
              description={blocked ? 'Você não participa mais desta conversa.' : 'Envie a primeira mensagem!'}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={styles.status}>
        {blocked ? <ErrorMessage message="Você não participa mais desta conversa e não pode enviar mensagens." /> : null}
        {sendStatus.state === 'failed' ? (
          <ErrorMessage message={sendStatus.message} onRetry={chat.retry} onDismiss={chat.dismissStatus} />
        ) : null}
        {sendStatus.state === 'push-failed' ? (
          <ErrorMessage tone="warning" message={sendStatus.message} onDismiss={chat.dismissStatus} />
        ) : null}
      </View>

      <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
        <ChatInput
          mentionableMembers={mentionableMembers}
          disabled={blocked}
          sending={sendStatus.state === 'sending'}
          onSend={chat.send}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg },
  list: { paddingVertical: spacing.md },
  emptyContainer: { flexGrow: 1 },
  status: { paddingHorizontal: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 240 },
  headerTexts: { flexShrink: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.textMuted },
  headerAction: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
