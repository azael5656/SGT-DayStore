import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import AlertsScreen from '../screens/AlertsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InventarioScreen from '../screens/InventarioScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { COLORS, ROUTES } from '../utils/constants';

/**
 * Bottom tabs principales de la app para usuarios autenticados.
 * Ventas y Auditoria siguen como placeholder hasta que se implemente la
 * feature correspondiente.
 */
const Tab = createBottomTabNavigator();

const Ventas = () => <PlaceholderScreen nombre="Ventas" />;
const Auditoria = () => <PlaceholderScreen nombre="Auditoria" />;

const icono = (emoji: string) => ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>{emoji}</Text>
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}>
      <Tab.Screen
        name={ROUTES.Dashboard}
        component={DashboardScreen}
        options={{ tabBarIcon: icono('📊') }}
      />
      <Tab.Screen
        name={ROUTES.Inventario}
        component={InventarioScreen}
        options={{ tabBarIcon: icono('📦') }}
      />
      <Tab.Screen
        name={ROUTES.Ventas}
        component={Ventas}
        options={{ tabBarIcon: icono('💰') }}
      />
      <Tab.Screen
        name={ROUTES.Alertas}
        component={AlertsScreen}
        options={{ tabBarIcon: icono('🔔') }}
      />
      <Tab.Screen
        name={ROUTES.Auditoria}
        component={Auditoria}
        options={{ tabBarIcon: icono('📋') }}
      />
    </Tab.Navigator>
  );
}
