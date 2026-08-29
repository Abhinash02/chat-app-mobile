import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, Badge, Button, Card, Field, Input, Loading } from '../../src/components/ui.jsx';
import { usersApi } from '../../src/api/endpoints.js';
import { formatCoins } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

function StatTile({ label, value, emoji }) {
  const { colors, radius } = useTheme();

  return (
    <View
      className="flex-1 items-center py-3.5"
      style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
    >
      <Text className="text-lg">{emoji}</Text>
      <Text className="mt-1 text-base font-bold" style={{ color: colors.textPrimary }}>
        {value}
      </Text>
      <Text className="text-[11px]" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

export default function Profile() {
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const { wallet } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [nickname, setNickname] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.me,
  });

  const save = useMutation({
    mutationFn: () => usersApi.updateMe({ nickname: nickname.trim(), bio: bio.trim() }),
    onSuccess: async () => {
      toast.success('Profile updated');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    },
    onError: (error) => toast.error(error.message ?? 'Could not save your profile'),
  });

  function startEditing() {
    setNickname(profile?.nickname ?? '');
    setBio(profile?.bio ?? '');
    setIsEditing(true);
  }

  /**
   * Photo upload. Permission is requested at the moment it is needed, not on
   * launch — a prompt with obvious context is far more likely to be granted.
   */
  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        toast.info('Allow photo access in Settings to change your picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        // The server re-derives the extension from the MIME type, so a wrong
        // filename here cannot smuggle anything past it.
        name: `avatar.${asset.uri.split('.').pop() ?? 'jpg'}`,
        type: asset.mimeType ?? 'image/jpeg',
      });

      await usersApi.uploadAvatar(formData);
      toast.success('Photo updated');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    } catch (uploadError) {
      toast.error(uploadError.message ?? 'Could not upload that photo');
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          You
        </Text>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" className="p-2">
          <Text className="text-xl">⚙️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center">
          <Pressable onPress={pickPhoto} disabled={isUploading} accessibilityRole="button" accessibilityLabel="Change your photo">
            <Avatar
              uri={profile?.avatarUrl}
              name={profile?.nickname}
              gender={profile?.gender}
              emoji={profile?.avatarEmoji}
              color={profile?.avatarColor}
              size={96}
            />
            <View
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.background }}
            >
              <Text style={{ fontSize: 13 }}>{isUploading ? '⏳' : '📷'}</Text>
            </View>
          </Pressable>

          <Text className="mt-3 text-xl font-bold" style={{ color: colors.textPrimary }}>
            {profile?.nickname}
          </Text>
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {profile?.email}
          </Text>

          <View className="mt-2 flex-row gap-2">
            <Badge
              label={profile?.gender === 'female' ? '👧 Girl' : '👦 Boy'}
              tone={profile?.gender === 'female' ? 'brand' : 'neutral'}
            />
            {wallet?.isUnlimited ? <Badge label="Unlimited chat" tone="success" /> : null}
          </View>

          {profile?.bio && !isEditing ? (
            <Text className="mt-3 px-6 text-center text-sm leading-5" style={{ color: colors.textSecondary }}>
              {profile.bio}
            </Text>
          ) : null}
        </View>

        <View className="mt-6 flex-row gap-3">
          <StatTile
            emoji="🪙"
            label="Coins"
            value={wallet?.isUnlimited ? '∞' : formatCoins(wallet?.coinBalance ?? 0)}
          />
          <StatTile emoji="🎮" label="Points" value={formatCoins(profile?.gamePoints ?? 0)} />
          <StatTile
            emoji="💬"
            label="Messages"
            value={wallet?.isUnlimited ? '∞' : formatCoins(wallet?.estimatedMessagesRemaining ?? 0)}
          />
        </View>

        {isEditing ? (
          <Card className="mt-5">
            <Field label="Nickname" hint="This is what everyone sees.">
              <Input value={nickname} onChangeText={setNickname} maxLength={24} autoCapitalize="none" />
            </Field>

            <Field label="About you" hint="A line or two. Profiles with a bio get more replies.">
              <Input
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={240}
                style={{ height: 88, textAlignVertical: 'top' }}
              />
            </Field>

            <View className="flex-row gap-2">
              <Button title="Cancel" variant="ghost" className="flex-1" onPress={() => setIsEditing(false)} />
              <Button
                title="Save"
                className="flex-1"
                isLoading={save.isPending}
                onPress={() => save.mutate()}
              />
            </View>
          </Card>
        ) : (
          <Button title="Edit profile" variant="outline" className="mt-5" onPress={startEditing} />
        )}

        <Card className="mt-4">
          <Pressable
            onPress={() => router.push('/coins')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">🪙</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Get coins
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">🏆</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Leaderboard
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">⚙️</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Settings
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
