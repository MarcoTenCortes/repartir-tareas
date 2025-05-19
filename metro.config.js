// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

// Añade la extensión 'cjs' para que Metro pueda resolver ciertas importaciones
defaultConfig.resolver.sourceExts.push('cjs');
// Esta línea evita que Metro aplique el flag de package-exports de forma demasiado estricta
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
