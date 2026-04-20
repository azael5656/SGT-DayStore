import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AuditoriaScreen from '../screens/AuditoriaScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import UsuariosScreen from '../screens/UsuariosScreen';
import { COLORS } from '../utils/constants';

const Stack = createStackNavigator();

const Ventas = () => <PlaceholderScreen nombre="Ventas" />;

/**
 * Stack del tab Home. El Home es el hub (sin header).
 * Desde ahi se navega a las secciones secundarias, que sí muestran
 * header con back-button automatico para que el usuario vuelva al hub.
 */
export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border },
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        headerTintColor: COLORS.primary,
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DashboardDetalle"
        component={DashboardScreen}
        options={{ title: 'Dashboard IoT' }}
      />
      <Stack.Screen
        name="VentasDetalle"
        component={Ventas}
        options={{ title: 'Ventas' }}
      />
      <Stack.Screen
        name="AuditoriaDetalle"
        component={AuditoriaScreen}
        options={{ title: 'Auditoria' }}
      />
      <Stack.Screen
        name="HistoricoDetalle"
        component={HistoricoScreen}
        options={{ title: 'Historico IoT' }}
      />
      <Stack.Screen
        name="UsuariosDetalle"
        component={UsuariosScreen}
        options={{ title: 'Usuarios' }}
      />
    </Stack.Navigator>
  );
}
