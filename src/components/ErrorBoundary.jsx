import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/*
 * Literals rather than theme colours, deliberately.
 *
 * A boundary that called `useTheme()` would throw inside its own fallback if
 * the theme provider is what failed, replacing a blank screen with a crash
 * loop. This has to render with no dependencies at all.
 */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 44, lineHeight: 52, marginBottom: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#1B1024', textAlign: 'center' },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#5C4A63',
    textAlign: 'center',
    maxWidth: 320,
  },
  detail: {
    marginTop: 16,
    fontSize: 11.5,
    lineHeight: 17,
    color: '#9C8AA6',
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 26,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: '#7C4DFF',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '700' },
});

/**
 * The last line of defence against a blank screen.
 *
 * React unmounts the whole tree when a render throws, so without a boundary a
 * single bad field from the API — a conversation whose partner was deleted, a
 * status whose media has been purged — takes the entire app to white, with
 * nothing to tap and no way back.
 *
 * Deliberately a class: `componentDidCatch` has no hook equivalent.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No crash reporter is wired up yet, so this is the only record that the
    // screen died. Worth keeping once one is: it survives offline.
    console.error('Unhandled render error', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>😵‍💫</Text>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.body}>
            That screen ran into a problem. Nothing on your account has changed — try again, and
            if it keeps happening let us know.
          </Text>

          {/* The message only, never the stack: a stack trace is noise to the
              person reading it and detail to anyone else. */}
          <Text style={styles.detail} numberOfLines={3}>
            {String(error?.message ?? error)}
          </Text>

          <Pressable onPress={this.handleReset} accessibilityRole="button" style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

export default ErrorBoundary;
