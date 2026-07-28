import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './app/context/AppContext';
import { AuthProvider } from './app/context/AuthContext';
import AppNavigator from './app/navigation/AppNavigator';

/**
 * Componente raiz de la app.
 * Envuelve todo con los providers que necesitamos:
 *   - SafeAreaProvider: para manejar notch / barra de estado.
 *   - AuthProvider: sesion de usuario.
 *   - AppProvider: estado global no relacionado con auth.
 *   - NavigationContainer: raiz del sistema de navegacion.
 *
 * La app es online-only: todas las pantallas leen y escriben directo al
 * backend por HTTP (axios). No hay base local ni sincronización.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
