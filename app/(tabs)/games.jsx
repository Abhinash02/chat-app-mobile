import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { EmptyState, Loading } from '../../src/components/ui.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { EmojiMatch } from '../../src/components/games/EmojiMatch.jsx';
import { NumberRush } from '../../src/components/games/NumberRush.jsx';
import { TapGame } from '../../src/components/games/TapGame.jsx';
import { TriviaDash } from '../../src/components/games/TriviaDash.jsx';
import { WordGuess } from '../../src/components/games/WordGuess.jsx';
import { gamesApi } from '../../src/api/endpoints.js';
import { formatCoins } from '../../src/lib/format.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const GAME_METADATA = {
  'quick-tap': { emoji: '⚡', color: '#F59E0B', badge: 'Reflexes', tagline: 'Tap targets the instant they light up' },
  'emoji-match': { emoji: '🃏', color: '#8B5CF6', badge: 'Memory', tagline: 'Flip and match emoji pairs fast' },
  'word-guess': { emoji: '🔤', color: '#06B6D4', badge: 'Word Clues', tagline: 'Guess the hidden word from smart hints' },
  'number-rush': { emoji: '🧮', color: '#10B981', badge: 'Math Sprint', tagline: 'Solve fast arithmetic puzzle chains' },
  'trivia-dash': { emoji: '🧠', color: '#EC4899', badge: 'Brain Quiz', tagline: 'Fast-paced general knowledge quiz' },
};

function GameCard({ game, onPlay, playable }) {
  const { colors } = useTheme();
  const meta = GAME_METADATA[game.key] || { emoji: '🎮', color: colors.primary, badge: 'Arcade', tagline: game.description };

  return (
    <Pressable
      onPress={playable ? onPlay : undefined}
      disabled={!playable}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.name}`}
      className="mb-3 p-3.5 rounded-3xl border shadow-sm flex-row items-center gap-3.5 active:scale-[0.98] transition"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: !playable ? 0.6 : 1,
      }}
    >
      {/* Game Icon */}
      <View
        className="h-13 w-13 items-center justify-center rounded-2xl border"
        style={{
          width: 52,
          height: 52,
          backgroundColor: `${meta.color}18`,
          borderColor: `${meta.color}35`,
        }}
      >
        <Text className="text-2xl">{meta.emoji}</Text>
      </View>

      {/* Game Info */}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
            {game.name}
          </Text>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${meta.color}15` }}
          >
            <Text className="text-[10px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
              {meta.badge}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} className="mt-0.5 text-xs font-medium" style={{ color: colors.textSecondary }}>
          {meta.tagline || game.description}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-1">
          <Ionicons name="trophy" size={11} color={colors.coinGold || '#F5A524'} />
          <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
            Best: <Text className="font-bold" style={{ color: colors.textPrimary }}>{formatCoins(game.personalBest || 0)} pts</Text>
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <View
        className="px-3.5 py-2 rounded-2xl shadow-sm flex-row items-center gap-1"
        style={{ backgroundColor: playable ? colors.primary : colors.surfaceAlt }}
      >
        <Ionicons
          name={playable ? 'play' : 'lock-closed'}
          size={12}
          color={playable ? (colors.onPrimary || '#FFFFFF') : colors.textMuted}
        />
        <Text
          className="text-xs font-black"
          style={{ color: playable ? (colors.onPrimary || '#FFFFFF') : colors.textMuted }}
        >
          {playable ? 'Play' : 'Soon'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Games() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeGame, setActiveGame] = useState(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertPointsInput, setConvertPointsInput] = useState('');

  const { data: games, isLoading, error } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
  });

  const { data: conversionInfo } = useQuery({
    queryKey: ['points-conversion'],
    queryFn: gamesApi.getPointsConversion,
  });

  const convertMutation = useMutation({
    mutationFn: (points) => gamesApi.convertPoints(points),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast.coins(`Converted ${data.pointsDeducted.toLocaleString()} pts to ${data.coinsCredited} coins! 🪙`);
      queryClient.invalidateQueries({ queryKey: ['points-conversion'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsConvertModalOpen(false);
      setConvertPointsInput('');
    },
    onError: (err) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      toast.error(err.message || 'Could not convert points. Please try again.');
    },
  });

  const PLAYABLE = {
    'quick-tap': TapGame,
    'number-rush': NumberRush,
    'emoji-match': EmojiMatch,
    'word-guess': WordGuess,
    'trivia-dash': TriviaDash,
  };

  const isPlayable = (key) => key in PLAYABLE;

  const currentPoints = conversionInfo?.gamePoints ?? 0;
  const pointsPerCoin = conversionInfo?.pointsPerCoin ?? 100;
  const minPoints = conversionInfo?.minPointsToConvert ?? 100;
  const isConversionEnabled = conversionInfo?.enabled ?? true;

  const numericPointsToConvert = parseInt(convertPointsInput, 10) || 0;
  const calculatedCoins = Math.floor(numericPointsToConvert / pointsPerCoin);
  const availableCoins = Math.floor(currentPoints / pointsPerCoin);

  function handleQuickSelect(pts) {
    const safePts = Math.min(pts, currentPoints);
    setConvertPointsInput(String(safePts));
  }

  function handleConvertSubmit() {
    if (numericPointsToConvert < minPoints) {
      toast.error(`Minimum points to convert is ${minPoints}`);
      return;
    }
    if (numericPointsToConvert > currentPoints) {
      toast.error(`You only have ${currentPoints.toLocaleString()} points`);
      return;
    }
    convertMutation.mutate(numericPointsToConvert);
  }

  if (activeGame) {
    const Game = PLAYABLE[activeGame.key];
    return <Game game={activeGame} onExit={() => setActiveGame(null)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Top Header with Coins on the Left / Header Area */}
      <View className="flex-row items-center justify-between px-4 pb-2.5 pt-2">
        <View className="flex-row items-center gap-3">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>
                Games
              </Text>
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${colors.primary}18` }}
              >
                <Text className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.primary }}>
                  Play & Win
                </Text>
              </View>
            </View>
            <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Win points & exchange for coins
            </Text>
          </View>
        </View>

        {/* Wallet / Coin Counter */}
        <WalletHeader compact />
      </View>

      {isLoading ? (
        <Loading label="Loading games…" />
      ) : error ? (
        <EmptyState emoji="🎮" title="Games are unavailable" description={error.message} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* COMPACT & STREAMLINED CONVERT POINTS HERO CARD */}
          {isConversionEnabled && (
            <View
              className="mb-3.5 p-3.5 rounded-3xl border shadow-sm"
              style={{
                backgroundColor: colors.surface,
                borderColor: `${colors.primary}30`,
              }}
            >
              <View className="flex-row items-center justify-between">
                {/* Left Side: Points & Available Coins */}
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center border shadow-sm"
                    style={{
                      backgroundColor: `${colors.coinGold || '#F5A524'}18`,
                      borderColor: `${colors.coinGold || '#F5A524'}35`,
                    }}
                  >
                    <Text className="text-xl">🌟</Text>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-baseline gap-1.5">
                      <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>
                        {currentPoints.toLocaleString()}
                      </Text>
                      <Text className="text-xs font-bold uppercase" style={{ color: colors.textSecondary }}>
                        Points
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                      <View
                        className="px-2 py-0.5 rounded-full flex-row items-center gap-1"
                        style={{ backgroundColor: `${colors.success || '#10B981'}15` }}
                      >
                        <Ionicons name="sparkles" size={10} color={colors.success || '#10B981'} />
                        <Text className="text-[11px] font-black" style={{ color: colors.success || '#10B981' }}>
                          {availableCoins} Coins Ready
                        </Text>
                      </View>

                      <Text className="text-[11px] font-medium" style={{ color: colors.textMuted }}>
                        ({pointsPerCoin} pts = 1 coin)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Side: Convert Button */}
                <Pressable
                  onPress={() => {
                    setConvertPointsInput(currentPoints >= minPoints ? String(currentPoints) : '');
                    setIsConvertModalOpen(true);
                  }}
                  accessibilityRole="button"
                  className="px-3.5 py-2.5 rounded-2xl shadow-sm active:scale-95 transition flex-row items-center gap-1.5"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Ionicons name="swap-horizontal" size={15} color={colors.onPrimary || '#FFFFFF'} />
                  <Text className="text-xs font-black tracking-wide" style={{ color: colors.onPrimary || '#FFFFFF' }}>
                    Convert
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* GLOBAL LEADERBOARD BANNER */}
          <Pressable
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            className="mb-4 p-3.5 rounded-3xl border shadow-sm flex-row items-center gap-3 active:scale-[0.98] transition"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <View
              className="h-10 w-10 rounded-2xl items-center justify-center border shadow-sm"
              style={{
                backgroundColor: 'rgba(245, 165, 36, 0.15)',
                borderColor: 'rgba(245, 165, 36, 0.35)',
              }}
            >
              <Text className="text-xl">🏆</Text>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-black tracking-tight" style={{ color: colors.textPrimary }}>
                  Leaderboard
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(245, 165, 36, 0.15)' }}
                >
                  <Text className="text-[9px] font-black uppercase text-amber-500">
                    Rankings
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                See who is winning across the app
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          {/* SECTION HEADER: ARCADE */}
          <View className="mb-2.5 flex-row items-center justify-between px-1">
            <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Arcade Games ({games?.length || 0})
            </Text>
            <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
              Free to play
            </Text>
          </View>

          {/* GAMES LIST */}
          {(games ?? []).map((game) => (
            <GameCard
              key={game.key}
              game={game}
              playable={isPlayable(game.key)}
              onPlay={() => setActiveGame(game)}
            />
          ))}

          <Text className="mt-3 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
            Collect points from games to exchange for chat & call coins!
          </Text>
        </ScrollView>
      )}

      {/* CONVERT POINTS TO COINS MODAL (Fixed backdrop & tap handling) */}
      <Modal
        visible={isConvertModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConvertModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Click Dismissal ONLY on background, NOT modal card */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsConvertModalOpen(false)} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <View
              className="rounded-3xl p-5 shadow-2xl space-y-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {/* Modal Header */}
              <View className="flex-row items-center justify-between border-b pb-3" style={{ borderColor: colors.border }}>
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-8 w-8 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${colors.primary}18` }}
                  >
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                  </View>
                  <Text className="text-base font-black" style={{ color: colors.textPrimary }}>
                    Convert Points to Coins
                  </Text>
                </View>

                <Pressable
                  onPress={() => setIsConvertModalOpen(false)}
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.surfaceAlt }}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Balance & Rate Stats Card */}
              <View
                className="p-3 rounded-2xl border flex-row items-center justify-between"
                style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
              >
                <View>
                  <Text className="text-[10px] uppercase font-bold" style={{ color: colors.textMuted }}>
                    Your Points
                  </Text>
                  <Text className="text-base font-black" style={{ color: colors.textPrimary }}>
                    🌟 {currentPoints.toLocaleString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase font-bold" style={{ color: colors.textMuted }}>
                    Exchange Rate
                  </Text>
                  <Text className="text-xs font-black" style={{ color: colors.primary }}>
                    {pointsPerCoin} Pts = 1 Coin 🪙
                  </Text>
                </View>
              </View>

              {/* Quick Select Presets */}
              <View>
                <Text className="text-xs font-bold mb-2" style={{ color: colors.textSecondary }}>
                  Quick Select Points:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((preset) => {
                    const isAvailable = currentPoints >= preset;
                    const isSelected = numericPointsToConvert === preset;
                    return (
                      <Pressable
                        key={preset}
                        disabled={!isAvailable}
                        onPress={() => handleQuickSelect(preset)}
                        className="px-2.5 py-1.5 rounded-xl border active:scale-95"
                        style={{
                          backgroundColor: isSelected ? `${colors.primary}20` : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: isAvailable ? 1 : 0.4,
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: isSelected ? colors.primary : colors.textPrimary,
                          }}
                        >
                          {preset.toLocaleString()} pts (+{Math.floor(preset / pointsPerCoin)} 🪙)
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Pressable
                    onPress={() => handleQuickSelect(currentPoints)}
                    disabled={currentPoints < minPoints}
                    className="px-2.5 py-1.5 rounded-xl border active:scale-95"
                    style={{
                      backgroundColor: numericPointsToConvert === currentPoints && currentPoints > 0 ? `${colors.primary}20` : colors.surfaceAlt,
                      borderColor: numericPointsToConvert === currentPoints && currentPoints > 0 ? colors.primary : colors.border,
                      opacity: currentPoints >= minPoints ? 1 : 0.4,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: numericPointsToConvert === currentPoints && currentPoints > 0 ? colors.primary : colors.textPrimary,
                      }}
                    >
                      All ({currentPoints.toLocaleString()})
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Custom Points Input (Won't close modal on click) */}
              <View>
                <Text className="text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
                  Custom Points:
                </Text>
                <View
                  className="flex-row items-center px-3.5 py-2 rounded-2xl border"
                  style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                  <TextInput
                    value={convertPointsInput}
                    onChangeText={(val) => setConvertPointsInput(val.replace(/[^0-9]/g, ''))}
                    placeholder={`Min ${minPoints} pts`}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    className="flex-1 text-base font-bold"
                    style={{ color: colors.textPrimary }}
                  />
                  <Text className="text-xs font-black uppercase" style={{ color: colors.textMuted }}>
                    PTS
                  </Text>
                </View>
              </View>

              {/* Live Coin Calculation Preview Box */}
              <View
                className="p-3 rounded-2xl border items-center justify-between flex-row"
                style={{
                  backgroundColor: `${colors.primary}0F`,
                  borderColor: `${colors.primary}30`,
                }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                  You will receive:
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xl font-black" style={{ color: colors.primary }}>
                    +{calculatedCoins}
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                    🪙 Coins
                  </Text>
                </View>
              </View>

              {/* Convert Action Button */}
              <Pressable
                onPress={handleConvertSubmit}
                disabled={convertMutation.isPending || calculatedCoins <= 0 || numericPointsToConvert > currentPoints}
                className="w-full py-3.5 rounded-2xl items-center justify-center shadow-md active:scale-95 transition"
                style={{
                  backgroundColor: (calculatedCoins > 0 && numericPointsToConvert <= currentPoints) ? colors.primary : colors.surfaceAlt,
                  opacity: convertMutation.isPending ? 0.6 : 1,
                }}
              >
                {convertMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
                ) : (
                  <Text
                    className="text-xs font-black tracking-wider uppercase"
                    style={{
                      color: (calculatedCoins > 0 && numericPointsToConvert <= currentPoints) ? (colors.onPrimary || '#FFFFFF') : colors.textMuted,
                    }}
                  >
                    Convert {numericPointsToConvert > 0 ? `${numericPointsToConvert.toLocaleString()} Pts` : 'Now'} →
                  </Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
