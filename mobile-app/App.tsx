import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { AppProvider } from './app/context/AppContext';
import { AuthProvider } from './app/context/AuthContext';
import AppNavigator from './app/navigation/AppNavigator';
import { database } from './app/database';

/**
 * Componente raiz de la app.
 * Envuelve todo con los providers que necesitamos:
 *   - DatabaseProvider: base local WatermelonDB (offline-first).
 *   - SafeAreaProvider: para manejar notch / barra de estado.
 *   - AuthProvider: sesion de usuario.
 *   - AppProvider: estado global no relacionado con auth.
 *   - NavigationContainer: raiz del sistema de navegacion.
 */
export default function App() {
  // Smoke-test de arranque: fuerza la inicialización del adaptador JSI y
  // confirma en logcat que WatermelonDB quedó operativo.
  useEffect(() => {
    database
      .get('products')
      .query()
      .fetchCount()
      .then((n) => console.log(`[WatermelonDB] OK — ${n} productos en cache local`))
      .catch((e) => console.error('[WatermelonDB] fallo al consultar:', e));
  }, []);

  return (
    <DatabaseProvider database={database}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </DatabaseProvider>
  );
}
