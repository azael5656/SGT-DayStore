import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/constants';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

/**
 * Elige que navegacion mostrar segun el estado de autenticacion.
 *  - Si estamos cargando la sesion desde AsyncStorage: spinner.
 *  - Si el usuario ya esta logueado: tabs principales.
 *  - Si no: stack de login/registro.
 */
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return isAuthenticated ? <TabNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
