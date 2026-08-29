/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  /**
   * Class-based rather than the default 'media'.
   *
   * This app's light/dark choice comes from the theme an administrator
   * activates, not from the device's system setting — so the scheme has to be
   * settable in code. NativeWind refuses to let anything set it while this is
   * 'media', which is what the runtime error was.
   */
  darkMode: 'class',
  theme: {
    extend: {
      /**
       * Only structural tokens live here. Every colour comes from the theme the
       * admin panel controls at runtime, so it cannot be baked into a Tailwind
       * class — see `src/theme/ThemeProvider.jsx`.
       */
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
};
