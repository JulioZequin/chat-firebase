import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import defaultAvatar from '../../assets/default-avatar.png';
import defaultGroup from '../../assets/default-group.png';
import { colors } from '../theme';

type Props = {
  uri: string | null | undefined;
  size?: number;
  variant?: 'user' | 'group';
};

/** Foto com fallback para imagem padrão quando a URL não existe ou falha ao carregar. */
export function Avatar({ uri, size = 44, variant = 'user' }: Props) {
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => setFailed(false), [uri]);

  const source = useMemo<ImageSourcePropType>(() => {
    if (uri && !failed) return { uri };
    return variant === 'group' ? defaultGroup : defaultAvatar;
  }, [uri, failed, variant]);

  return (
    <Image
      source={source}
      onError={() => setFailed(true)}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.primarySoft },
});
