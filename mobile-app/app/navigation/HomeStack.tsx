import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AuditoriaScreen from '../screens/AuditoriaScreen';
import ClienteDetalleScreen from '../screens/ClienteDetalleScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ConfiguracionTiendaScreen from '../screens/ConfiguracionTiendaScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import MiNegocioScreen from '../screens/MiNegocioScreen';
import PDFViewerScreen from '../screens/PDFViewerScreen';
import TasasScreen from '../screens/TasasScreen';
import UsuariosScreen from '../screens/UsuariosScreen';
import VentasScreen from '../screens/VentasScreen';
import { COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();

/**
 * Stack del tab Home. El Home es el hub (sin header).
 * Desde ahi se navega a las secciones secundarias, que sí muestran
 * header con back-button automatico para que el usuario vuelva al hub.
 *
 * Las pantallas de gerencia solo se registran para admin/superadmin: un
 * vendedor no puede ni siquiera navegar a ellas (la ruta no existe para el).
 */
export default function HomeStack() {
  const { user } = useAuth();
  const esGerencia = user?.role === 'admin' || user?.role === 'superadmin';
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
        name="VentasDetalle"
        component={VentasScreen}
        options={{ title: 'Ventas' }}
      />
      {esGerencia && (
        <Stack.Group>
          <Stack.Screen
            name="DashboardDetalle"
            component={DashboardScreen}
            options={{ title: 'Dashboard IoT' }}
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
            name="Clientes"
            component={ClientesScreen}
            options={{ title: 'Clientes / Deudores' }}
          />
          <Stack.Screen
            name="ClienteDetalle"
            component={ClienteDetalleScreen}
            options={{ title: 'Detalle del cliente' }}
          />
          <Stack.Screen
            name="MiNegocioDetalle"
            component={MiNegocioScreen}
            options={{ title: 'Mi negocio' }}
          />
        </Stack.Group>
      )}
      <Stack.Screen
        name="PDFViewer"
        component={PDFViewerScreen}
        options={{ title: 'PDF' }}
      />
    </Stack.Navigator>
  );
}
