const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Configuracion de Metro (el bundler de React Native).
 * Usamos la config por defecto, suficiente para proyectos bare.
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
