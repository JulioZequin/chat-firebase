import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  /** URI local escolhida (ainda não enviada) */
  localUri: string | null;
  /** URL já salva (edição) */
  currentUrl?: string;
  onPick: (uri: string) => void;
  variant?: 'user' | 'group';
  error?: string;
};

type Source = 'camera' | 'library';

/** Seleciona foto da galeria ou câmera, pedindo e tratando as permissões. */
export function PhotoPicker({ localUri, currentUrl, onPick, variant = 'user', error }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  const pick = useCallback(
    async (source: Source) => {
      setMessage(null);
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          source === 'camera'
            ? 'Permissão de câmera negada. Libere nas configurações do aparelho.'
            : 'Permissão de fotos negada. Libere nas configurações do aparelho.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets.length > 0) onPick(result.assets[0].uri);
    },
    [onPick],
  );

  const choose = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tirar foto', 'Escolher da galeria'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pick('camera');
          if (index === 2) pick('library');
        },
      );
      return;
    }
    Alert.alert('Foto', 'Escolha a origem da imagem', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Câmera', onPress: () => pick('camera') },
      { text: 'Galeria', onPress: () => pick('library') },
    ]);
  }, [pick]);

  return (
    <View style={styles.container}>
      <Pressable onPress={choose} accessibilityRole="button" accessibilityLabel="Selecionar foto">
        <Avatar uri={localUri ?? currentUrl} size={96} variant={variant} />
        <Text style={styles.link}>{localUri || currentUrl ? 'Trocar foto' : 'Escolher foto'}</Text>
      </Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
  link: { color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
