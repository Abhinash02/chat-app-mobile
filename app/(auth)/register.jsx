import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { Field, GradientButton, Input } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

/**
 * Mirrors the server's rules so a mistake is caught before a round trip.
 * The server validates the same things again — this is a courtesy, not the
 * enforcement.
 */
function validate({ name, nickname, email, password, gender }) {
  const errors = {};

  if (name.trim().length < 2) errors.name = 'Enter your name';
  if (!/^[a-zA-Z0-9_.]{2,24}$/.test(nickname.trim())) {
    errors.nickname = 'Letters, numbers, dots and underscores only';
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'At least 8 characters';
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Needs an uppercase letter, a lowercase letter and a number';
  }
  if (!gender) errors.gender = 'Select one to continue';

  return errors;
}

const AGE_GROUPS = [
  { label: '18–21', value: '18-21', emoji: '🎓', hint: 'Campus Life' },
  { label: '22–25', value: '22-25', emoji: '🚀', hint: 'Young Pro' },
  { label: '26–29', value: '26-29', emoji: '🌟', hint: 'Mid 20s' },
  { label: '30+', value: '30+', emoji: '👑', hint: 'Established' },
];

const ZODIAC_SIGNS = [
  { label: 'Aries', symbol: '♈', value: 'Aries ♈' },
  { label: 'Taurus', symbol: '♉', value: 'Taurus ♉' },
  { label: 'Gemini', symbol: '♊', value: 'Gemini ♊' },
  { label: 'Cancer', symbol: '♋', value: 'Cancer ♋' },
  { label: 'Leo', symbol: '♌', value: 'Leo ♌' },
  { label: 'Virgo', symbol: '♍', value: 'Virgo ♍' },
  { label: 'Libra', symbol: '♎', value: 'Libra ♎' },
  { label: 'Scorpio', symbol: '♏', value: 'Scorpio ♏' },
  { label: 'Sagittarius', symbol: '♐', value: 'Sagittarius ♐' },
  { label: 'Capricorn', symbol: '♑', value: 'Capricorn ♑' },
  { label: 'Aquarius', symbol: '♒', value: 'Aquarius ♒' },
  { label: 'Pisces', symbol: '♓', value: 'Pisces ♓' },
];

function GenderOption({ value, label, emoji, selected, onSelect }) {
  const { colors, radius } = useTheme();
  const isSelected = selected === value;
  const accent = value === 'female' ? colors.femaleAccent : colors.maleAccent;

  return (
    <Pressable
      onPress={() => onSelect(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
      className="flex-1 items-center gap-1.5 py-4"
      style={{
        backgroundColor: isSelected ? `${accent}1A` : colors.surface,
        borderRadius: radius,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? accent : colors.border,
      }}
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text
        className="text-sm font-semibold"
        style={{ color: isSelected ? accent : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Register() {
  const { colors, radius } = useTheme();
  const { register } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: '',
    nickname: '',
    email: '',
    password: '',
    gender: '',
    ageGroup: '18-21',
    zodiacSign: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function handleSubmit() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        gender: form.gender,
        ageGroup: form.ageGroup,
        zodiacSign: form.zodiacSign || null,
      });

      toast.success('Check your inbox for the code');
      router.push({ pathname: '/(auth)/verify', params: { email: form.email.trim().toLowerCase() } });
    } catch (submitError) {
      if (submitError.code === 'EMAIL_TAKEN') setErrors({ email: submitError.message });
      else if (submitError.code === 'NICKNAME_TAKEN') setErrors({ nickname: submitError.message });
      else if (submitError.code === 'VALIDATION_ERROR' && Array.isArray(submitError.details)) {
        setErrors(
          Object.fromEntries(submitError.details.map((issue) => [issue.field, issue.message])),
        );
      } else {
        toast.error(submitError.message ?? 'Could not create your account');
      }
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
          onPress={() => router.replace('/(auth)/login')}
          className="mb-6 flex-row items-center gap-2 self-start px-3.5 py-2 active:opacity-75"
          style={{
            backgroundColor: colors.surface,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to Sign In"
        >
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.primary}18` }}
          >
            <Ionicons name="chevron-back" size={15} color={colors.primary} />
          </View>
          <Text className="text-xs font-bold tracking-tight pr-1" style={{ color: colors.textPrimary }}>
            Back to Sign In
          </Text>
        </Pressable>

        <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
          Create your account
        </Text>
        <Text className="mb-7 mt-1.5 text-base" style={{ color: colors.textMuted }}>
          It takes a minute. We will email you a code to confirm it is you.
        </Text>

        <Field label="Your name" error={errors.name}>
          <Input
            value={form.name}
            onChangeText={(value) => set('name', value)}
            placeholder="Aarav Sharma"
            autoCapitalize="words"
            autoComplete="name"
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="Nickname"
          error={errors.nickname}
          hint="This is what everyone else sees. Your real name stays private."
        >
          <Input
            value={form.nickname}
            onChangeText={(value) => set('nickname', value)}
            placeholder="aarav"
            autoCapitalize="none"
            maxLength={24}
            invalid={Boolean(errors.nickname)}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <Input
            value={form.email}
            onChangeText={(value) => set('email', value)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          hint="At least 8 characters, with an uppercase letter and a number."
        >
          <View className="relative">
            <Input
              value={form.password}
              onChangeText={(value) => set('password', value)}
              placeholder="Choose a strong password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
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

        <Field
          label="I am a"
          error={errors.gender}
          hint="This decides who you see and who sees you, and cannot be changed later."
        >
          <View className="flex-row gap-3">
            <GenderOption
              value="male"
              label="Boy"
              emoji="👦"
              selected={form.gender}
              onSelect={(value) => set('gender', value)}
            />
            <GenderOption
              value="female"
              label="Girl"
              emoji="👧"
              selected={form.gender}
              onSelect={(value) => set('gender', value)}
            />
          </View>
        </Field>

        {/* Age Bracket Selection */}
        <Field label="Age Bracket" hint="Shown on your profile so you can match with people in your range.">
          <View className="flex-row flex-wrap gap-2.5">
            {AGE_GROUPS.map((ag) => {
              const isSelected = form.ageGroup === ag.value;
              return (
                <Pressable
                  key={ag.value}
                  onPress={() => set('ageGroup', ag.value)}
                  className="flex-1 min-w-[45%] py-3 px-3.5 items-center"
                  style={{
                    backgroundColor: isSelected ? `${colors.primary}18` : colors.surface,
                    borderRadius: radius,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{ag.emoji}</Text>
                  <Text
                    className="text-sm font-bold mt-1"
                    style={{ color: isSelected ? colors.primary : colors.textPrimary }}
                  >
                    {ag.label}
                  </Text>
                  <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                    {ag.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* Zodiac Sign Selection (Optional) */}
        <Field label="Zodiac Sign (Optional)" hint="Adds astrological vibe to your profile. You can skip this.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 py-1">
            <View className="flex-row gap-2 px-1">
              <Pressable
                onPress={() => set('zodiacSign', null)}
                className="py-2 px-3 items-center justify-center"
                style={{
                  backgroundColor: !form.zodiacSign ? colors.primary : colors.surface,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: !form.zodiacSign ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: !form.zodiacSign ? colors.onPrimary : colors.textPrimary }}
                >
                  None
                </Text>
              </Pressable>

              {ZODIAC_SIGNS.map((z) => {
                const isSelected = form.zodiacSign === z.value;
                return (
                  <Pressable
                    key={z.value}
                    onPress={() => set('zodiacSign', isSelected ? null : z.value)}
                    className="py-2 px-3 items-center"
                    style={{
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderRadius: radius,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{z.symbol}</Text>
                    <Text
                      className="text-xs font-semibold mt-0.5"
                      style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}
                    >
                      {z.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Field>

        <GradientButton
          title="Create account"
          className="mt-4"
          isLoading={isSubmitting}
          onPress={handleSubmit}
        />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
