import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHero } from '../../src/components/AuthHero.jsx';
import { Field, GradientButton, Input } from '../../src/components/ui.jsx';
import { request } from '../../src/api/client.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

export default function ForgotPassword() {
  const { colors } = useTheme();
  const toast = useToast();

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
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHero
          title={step === 'request' ? 'Reset your password' : 'Enter the code'}
          subtitle={
            step === 'request'
              ? 'Tell us your email and we will send a code to reset it.'
              : `Enter the code we sent to ${email} and choose a new password.`
          }
          // Back steps within the screen before it leaves it, so someone who
          // mistyped their email is not thrown out of the flow to fix it.
          onBack={() => {
            // Step back inside the screen first, so someone who mistyped their
            // email fixes it here instead of being thrown out of the flow.
            if (step === 'reset') {
              setStep('request');
              return;
            }

            /*
             * `router.back()` alone is a no-op when there is nothing to go back
             * to — a reload, or a deep link straight to this screen — which is
             * exactly how the button ended up doing nothing. Sign-in is where
             * back means to go from here, so that is the fallback.
             */
            if (router.canGoBack()) router.back();
            else router.replace('/(auth)/login');
          }}
          compact
        />

        {/* Two steps, shown as progress: "enter the code" is not a dead end,
            it is the second half of something already underway. */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 22, marginTop: 18 }}>
          {['request', 'reset'].map((name, position) => {
            const isDone = step === 'reset' && position === 0;
            const isCurrent = step === name;
            return (
              <View key={name} style={{ flex: 1, gap: 6 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDone || isCurrent ? colors.primary : colors.border,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                    color: isDone || isCurrent ? colors.primary : colors.textMuted,
                  }}
                >
                  {position === 0 ? '1 · YOUR EMAIL' : '2 · NEW PASSWORD'}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
            padding: 20,
            borderRadius: 24,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#0F0817',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 4,
          }}
        >
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
