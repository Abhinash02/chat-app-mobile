import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, GradientButton, Input } from '../../src/components/ui.jsx';
import { request } from '../../src/api/client.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

export default function ForgotPassword() {
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  // Two steps in one screen: asking for the code, then using it.
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function requestCode() {
    setError(null);
    setIsSubmitting(true);

    try {
      await request({
        method: 'POST',
        url: '/auth/forgot-password',
        data: { email: email.trim().toLowerCase() },
      });

      // The server answers the same way whether or not the address exists, so
      // the copy here must not imply the account was found.
      toast.success('If that address has an account, a code is on its way');
      setStep('reset');
    } catch (submitError) {
      setError(submitError.message ?? 'Could not send the code');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword() {
    setError(null);
    setIsSubmitting(true);

    try {
      await request({
        method: 'POST',
        url: '/auth/reset-password',
        data: { email: email.trim().toLowerCase(), code: code.trim(), newPassword },
      });

      toast.success('Password changed — sign in with it now');
      router.replace('/(auth)/login');
    } catch (submitError) {
      setError(submitError.message ?? 'Could not reset your password');
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
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        <Pressable
          onPress={() => (step === 'reset' ? setStep('request') : router.back())}
          className="mb-6 self-start"
          accessibilityRole="button"
        >
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            ← Back
          </Text>
        </Pressable>

        <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
          {step === 'request' ? 'Reset your password' : 'Enter the code'}
        </Text>
        <Text className="mb-7 mt-1.5 text-base leading-6" style={{ color: colors.textMuted }}>
          {step === 'request'
            ? 'Tell us your email and we will send a code to reset it.'
            : `Enter the code we sent to ${email} and choose a new password.`}
        </Text>

        {step === 'request' ? (
          <>
            <Field label="Email">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                invalid={Boolean(error)}
              />
            </Field>

            <GradientButton
              title="Send the code"
              isLoading={isSubmitting}
              disabled={!email.trim()}
              onPress={requestCode}
            />
          </>
        ) : (
          <>
            <Field label="Code">
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                invalid={Boolean(error)}
              />
            </Field>

            <Field
              label="New password"
              hint="At least 8 characters, with an uppercase letter and a number."
            >
              <View className="relative">
                <Input
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Choose a new password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  invalid={Boolean(error)}
                  style={{ paddingRight: 48 }}
                />
                <Pressable
                  onPress={() => setShowPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-0 bottom-0 justify-center px-1"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </Field>

            <GradientButton
              title="Change password"
              isLoading={isSubmitting}
              disabled={code.length < 6 || newPassword.length < 8}
              onPress={resetPassword}
            />
          </>
        )}

        {error ? (
          <View
            className="mt-4 px-4 py-3"
            style={{ backgroundColor: `${colors.danger}14`, borderRadius: 12 }}
            accessibilityRole="alert"
          >
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
