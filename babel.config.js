module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // `jsxImportSource` is what lets NativeWind's className prop reach
      // React Native components.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
