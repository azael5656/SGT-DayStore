import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';

/**
 * Indicador visual global de falta de conexión a internet.
 *
 * La app es online-only: sin internet no puede leer ni escribir datos, así
 * que avisamos con una barra ámbar en la parte superior. En línea no se
 * muestra (no ocupa espacio).
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useApp();

  if (!isOffline) return null;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: COLORS.warning,
      }}>
      <Text
        style={{
          textAlign: 'center',
          color: '#fff',
          fontWeight: '700',
          fontSize: 12,
          paddingVertical: 6,
        }}>
        ● Sin conexión — revisa tu internet
      </Text>
    </View>
  );
}
