import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function Verify() {
  const { colors, radius } = useTheme();
  const { verifyEmail, resendCode } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Autofocus so the keyboard is already up when the SMS or email arrives.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  async function submit(value) {
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyEmail({ email, code: value });
      toast.success('You are all set!');
      router.replace('/(tabs)');
    } catch (submitError) {
      setError(submitError.message ?? 'That code did not work');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(value) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);

    // Submitting on the last digit saves a tap, which matters on a screen
    // people reach with the code already in their hand.
    if (digits.length === CODE_LENGTH) submit(digits);
  }

  async function handleResend() {
    try {
      await resendCode(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('Sent — check your inbox');
    } catch (resendError) {
      toast.error(resendError.message ?? 'Could not resend the code');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 px-6"
      style={{ backgroundColor: colors.background, paddingTop: insets.top + 24 }}
    >
      <Pressable onPress={() => router.back()} className="mb-6 self-start" accessibilityRole="button">
        <Text className="text-base" style={{ color: colors.textSecondary }}>
          ← Back
        </Text>
      </Pressable>

      <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
        Check your email
      </Text>
      <Text className="mt-1.5 text-base leading-6" style={{ color: colors.textMuted }}>
        We sent a {CODE_LENGTH}-digit code to{'\n'}
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
      </Text>

      <Pressable onPress={() => inputRef.current?.focus()} className="mt-9">
        <View className="flex-row justify-between gap-2">
          {Array.from({ length: CODE_LENGTH }).map((_, index) => {
            const digit = code[index];
            const isCursor = index === code.length;

            return (
              <View
                key={index}
                className="flex-1 items-center justify-center py-4"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius,
                  borderWidth: isCursor ? 2 : 1,
                  borderColor: error ? colors.danger : isCursor ? colors.primary : colors.border,
                }}
              >
                <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                  {digit ?? ''}
                </Text>
              </View>
            );
          })}
        </View>

        {/* One hidden field behind six boxes: the OS can autofill a one-time
            code into it, which per-box inputs break. */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          accessibilityLabel="Verification code"
          className="absolute h-full w-full opacity-0"
        />
      </Pressable>

      {error ? (
        <Text className="mt-4 text-center text-sm" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <GradientButton
        title="Verify"
        className="mt-7"
        isLoading={isSubmitting}
        disabled={code.length < CODE_LENGTH}
        onPress={() => submit(code)}
      />

      <View className="mt-6 flex-row justify-center">
        {cooldown > 0 ? (
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            Resend the code in {cooldown}s
          </Text>
        ) : (
          <Pressable onPress={handleResend} accessibilityRole="button">
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              Send a new code
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
