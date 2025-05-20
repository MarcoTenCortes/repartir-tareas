// babel.config.js
module.exports = {
  presets: ['babel-preset-expo'], // o 'module:metro-react-native-babel-preset' si no es Expo puro
  plugins: [
    // ...otros plugins
    'react-native-reanimated/plugin', // Asegúrate que este sea el último plugin
  ],
};
