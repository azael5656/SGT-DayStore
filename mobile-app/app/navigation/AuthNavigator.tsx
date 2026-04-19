import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { ROUTES } from '../utils/constants';

/**
 * Stack de pantallas para usuarios NO autenticados.
 * Incluye Login y Register. El AppNavigator elige este stack cuando
 * no hay token en AsyncStorage.
 */
const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.Login} component={LoginScreen} />
      <Stack.Screen name={ROUTES.Register} component={RegisterScreen} />
    </Stack.Navigator>
  );
}
