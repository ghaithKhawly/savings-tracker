const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 'victory-native' and 'd3' often use .mjs files
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_conditionsByPlatform.web = [
  'react-native',
  ...(config.resolver.unstable_conditionsByPlatform.web || []),
];

module.exports = config;
