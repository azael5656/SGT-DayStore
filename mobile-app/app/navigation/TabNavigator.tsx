import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { COLORS, ROUTES } from '../utils/constants';

/**
 * Bottom tabs principales de la app para usuarios autenticados.
 * Las 5 pantallas son placeholders por ahora; cada una se reemplaza
 * cuando se implemente la feature correspondiente.
 */
const Tab = createBottomTabNavigator();

const Dashboard = () => <PlaceholderScreen nombre="Dashboard" />;
const Inventario = () => <PlaceholderScreen nombre="Inventario" />;
const Ventas = () => <PlaceholderScreen nombre="Ventas" />;
const Alertas = () => <PlaceholderScreen nombre="Alertas" />;
const Auditoria = () => <PlaceholderScreen nombre="Auditoria" />;

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}>
      <Tab.Screen name={ROUTES.Dashboard} component={Dashboard} />
      <Tab.Screen name={ROUTES.Inventario} component={Inventario} />
      <Tab.Screen name={ROUTES.Ventas} component={Ventas} />
      <Tab.Screen name={ROUTES.Alertas} component={Alertas} />
      <Tab.Screen name={ROUTES.Auditoria} component={Auditoria} />
    </Tab.Navigator>
  );
}
