import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, GradientButton, Input } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

export default function Login() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (submitError) {
      // An unverified account is not a failure — it is a different next step.
      if (submitError.code === 'EMAIL_NOT_VERIFIED') {
        toast.info('Enter the code we emailed you.');
        router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
        return;
      }

      setError(submitError.message ?? 'Could not sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        <Pressable onPress={() => router.back()} className="mb-6 self-start" accessibilityRole="button">
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            ← Back
          </Text>
        </Pressable>

        <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
          Welcome back
        </Text>
        <Text className="mb-8 mt-1.5 text-base" style={{ color: colors.textMuted }}>
          Sign in to pick up where you left off.
        </Text>

        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            invalid={Boolean(error)}
          />
        </Field>

        <Field label="Password">
          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              invalid={Boolean(error)}
              style={{ paddingRight: 64 }}
            />
            <Pressable
              onPress={() => setShowPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-0 bottom-0 justify-center px-1"
            >
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>
        </Field>

        {error ? (
          <View
            className="mb-4 px-4 py-3"
            style={{ backgroundColor: `${colors.danger}14`, borderRadius: 12 }}
            accessibilityRole="alert"
          >
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        <GradientButton
          title="Sign in"
          isLoading={isSubmitting}
          disabled={!email.trim() || !password}
          onPress={handleSubmit}
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          className="mt-5 self-center"
          accessibilityRole="button"
        >
          <Text className="text-sm font-medium" style={{ color: colors.primary }}>
            Forgot your password?
          </Text>
        </Pressable>

        <View className="mt-auto flex-row justify-center pt-10">
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            New here?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/register')} accessibilityRole="button">
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
