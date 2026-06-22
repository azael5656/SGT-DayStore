module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // WatermelonDB usa decoradores legacy (@field/@text/@date/@children/@relation)
  // en sus modelos. Tras este cambio, reiniciar Metro con --reset-cache.
  plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
};
