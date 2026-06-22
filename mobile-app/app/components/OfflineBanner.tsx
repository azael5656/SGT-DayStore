import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useSync } from '../context/SyncContext';
import { COLORS } from '../utils/constants';

/**
 * Indicador visual global de modo offline (lo exige el documento offline-first).
 * Barra delgada en la parte superior:
 *  - sin conexión → aviso ámbar "trabajando offline";
 *  - sincronizando → aviso azul "Sincronizando…";
 *  - en línea y al día → no se muestra (no ocupa espacio).
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useApp();
  const { syncing } = useSync();

  if (!isOffline && !syncing) return null;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: isOffline ? COLORS.warning : COLORS.info,
      }}>
      <Text
        style={{
          textAlign: 'center',
          color: '#fff',
          fontWeight: '700',
          fontSize: 12,
          paddingVertical: 6,
        }}>
        {isOffline ? '● Sin conexión — trabajando offline' : '↻ Sincronizando…'}
      </Text>
    </View>
  );
}
