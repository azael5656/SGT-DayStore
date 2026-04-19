import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import AlertsScreen from '../screens/AlertsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { COLORS, ROUTES } from '../utils/constants';

/**
 * Bottom tabs principales de la app para usuarios autenticados.
 *
 * Dashboard y Alertas ya tienen implementacion real conectada al
 * microservicio IoT. Inventario, Ventas y Auditoria siguen como
 * placeholder hasta que se implemente la feature correspondiente.
 */
const Tab = createBottomTabNavigator();

const Inventario = () => <PlaceholderScreen nombre="Inventario" />;
const Ventas = () => <PlaceholderScreen nombre="Ventas" />;
const Auditoria = () => <PlaceholderScreen nombre="Auditoria" />;

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}>
      <Tab.Screen name={ROUTES.Dashboard} component={DashboardScreen} />
      <Tab.Screen name={ROUTES.Inventario} component={Inventario} />
      <Tab.Screen name={ROUTES.Ventas} component={Ventas} />
      <Tab.Screen name={ROUTES.Alertas} component={AlertsScreen} />
      <Tab.Screen name={ROUTES.Auditoria} component={Auditoria} />
    </Tab.Navigator>
  );
}
