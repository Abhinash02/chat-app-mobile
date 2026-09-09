import React from 'react';
import { Platform, StyleSheet, Text, TextInput } from 'react-native';

/**
 * Makes Cause the app's default typeface, everywhere.
 *
 * React Native has no CSS-style inheritance: a `fontFamily` on a View does not
 * reach the Text inside it, so "use this font in the app" cannot be expressed
 * as one rule at the root. The two platforms need different answers.
 *
 * On the web the browser *does* inherit, so a single CSS rule on the document
 * covers every element — that lives in `global.css`, and nothing here runs.
 *
 * On native the components that actually draw glyphs are taught to supply a
 * default. Two properties make that safe:
 *
 *   - anything with its own `fontFamily` is returned untouched, so icon fonts
 *     (Ionicons draws its glyphs through one) keep working;
 *   - the family is chosen from the weight, because Android does not
 *     synthesise bold for a custom family — asking for `Cause-Regular` at
 *     weight 800 renders regular, which is why bold headings look flat if you
 *     register only one file.
 */

const WEIGHT_TO_FAMILY = {
  100: 'Cause-Regular',
  200: 'Cause-Regular',
  300: 'Cause-Regular',
  400: 'Cause-Regular',
  normal: 'Cause-Regular',
  500: 'Cause-SemiBold',
  600: 'Cause-SemiBold',
  700: 'Cause-Bold',
  800: 'Cause-Bold',
  900: 'Cause-Bold',
  bold: 'Cause-Bold',
};

/**
 * Off until the files are actually registered.
 *
 * Naming a family Android has not loaded yet renders nothing at all, so the
 * patch stays inert until `markFontsReady` is called — the app simply shows
 * the system face for the moment before that.
 */
let fontsReady = false;

export function markFontsReady() {
  fontsReady = true;
}

function familyFor(style) {
  return WEIGHT_TO_FAMILY[style?.fontWeight] ?? 'Cause-Regular';
}

function patch(Component) {
  const original = Component.render;
  if (typeof original !== 'function' || Component.__causeFontPatched) return;

  Component.render = function renderWithDefaultFont(...args) {
    const element = original.apply(this, args);
    if (!fontsReady || !React.isValidElement(element)) return element;

    const flattened = StyleSheet.flatten(element.props?.style) || {};
    // An explicit family wins — this is what keeps icon fonts intact.
    if (flattened.fontFamily) return element;

    const family = familyFor(flattened);
    const style = Platform.OS === 'android'
      ? [element.props?.style, { fontFamily: family, fontWeight: 'normal' }]
      : [{ fontFamily: family }, element.props?.style];

    return React.cloneElement(element, { style });
  };

  Component.__causeFontPatched = true;
}

/*
 * Deliberately native-only.
 *
 * `Text.render` on react-native-web returns a DOM element whose `style` prop
 * has already been resolved to a plain CSS object. Handing that back a React
 * Native style *array* makes the DOM try to set an indexed property on a
 * CSSStyleDeclaration, which throws and takes the screen down with it. The
 * browser inherits font-family on its own, so there is nothing to patch there.
 */
if (Platform.OS !== 'web') {
  patch(Text);
  patch(TextInput);
}
