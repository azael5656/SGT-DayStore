import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AuditoriaScreen from '../screens/AuditoriaScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ConfiguracionTiendaScreen from '../screens/ConfiguracionTiendaScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import MiNegocioScreen from '../screens/MiNegocioScreen';
import TasasScreen from '../screens/TasasScreen';
import UsuariosScreen from '../screens/UsuariosScreen';
import VentasScreen from '../screens/VentasScreen';
import { COLORS } from '../utils/constants';

const Stack = createStackNavigator();

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
        component={VentasScreen}
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
      <Stack.Screen
        name="ConfigTiendaDetalle"
        component={ConfiguracionTiendaScreen}
        options={{ title: 'Configuracion de la tienda' }}
      />
      <Stack.Screen
        name="TasasDetalle"
        component={TasasScreen}
        options={{ title: 'Tasas de cambio' }}
      />
      <Stack.Screen
        name="ClientesDetalle"
        component={ClientesScreen}
        options={{ title: 'Clientes / Deudores' }}
      />
      <Stack.Screen
        name="MiNegocioDetalle"
        component={MiNegocioScreen}
        options={{ title: 'Mi negocio' }}
      />
    </Stack.Navigator>
  );
}
