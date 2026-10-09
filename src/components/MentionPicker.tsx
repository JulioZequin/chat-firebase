import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicUser } from '../types/user';
import { colors, radius, spacing } from '../theme';
import { UserListItem } from './UserListItem';

type Props = {
  visible: boolean;
  members: PublicUser[];
  selectedIds: readonly string[];
  onToggle: (uid: string) => void;
  onClose: () => void;
};

/** Seleção de integrantes para mencionar/direcionar uma mensagem do grupo. */
export function MentionPicker({ visible, members, selectedIds, onToggle, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Mencionar / direcionar</Text>
          <Text style={styles.hint}>
            1 integrante: a mensagem fica direcionada a ele. Vários: todos são mencionados. A mensagem continua no histórico do grupo.
          </Text>
          <FlatList
            data={members}
            keyExtractor={(u) => u.uid}
            renderItem={({ item }) => (
              <UserListItem user={item} selectable selected={selectedIds.includes(item.uid)} onPress={(u) => onToggle(u.uid)} />
            )}
            ListEmptyComponent={<Text style={styles.hint}>Não há outros integrantes no grupo.</Text>}
            style={styles.list}
          />
          <Pressable onPress={onClose} style={styles.done} accessibilityRole="button">
            <Text style={styles.doneText}>Concluir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, maxHeight: '75%' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  list: { flexGrow: 0 },
  done: { backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
