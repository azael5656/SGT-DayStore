/**
 * Punto de entrada de la app.
 * Registra el componente App en el AppRegistry de React Native.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
