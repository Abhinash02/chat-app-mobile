import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Card, EmptyState, Loading } from '../../src/components/ui.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { EmojiMatch } from '../../src/components/games/EmojiMatch.jsx';
import { NumberRush } from '../../src/components/games/NumberRush.jsx';
import { TapGame } from '../../src/components/games/TapGame.jsx';
import { TriviaDash } from '../../src/components/games/TriviaDash.jsx';
import { WordGuess } from '../../src/components/games/WordGuess.jsx';
import { gamesApi } from '../../src/api/endpoints.js';
import { formatCoins } from '../../src/lib/format.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

const GAME_EMOJI = {
  'quick-tap': '⚡',
  'emoji-match': '🃏',
  'word-guess': '🔤',
  'number-rush': '🧮',
  'trivia-dash': '🧠',
};

function GameCard({ game, onPlay, playable }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={playable ? onPlay : undefined}
      disabled={!playable}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.name}`}
      className="mb-3 flex-row items-center gap-3.5 p-4"
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: !playable ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${colors.primary}14` }}
      >
        <Text className="text-2xl">{GAME_EMOJI[game.key] ?? '🎮'}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
          {game.name}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-xs leading-4" style={{ color: colors.textMuted }}>
          {game.description}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-[10px]" style={{ color: colors.textMuted }}>
          Your best
        </Text>
        <Text className="text-base font-bold" style={{ color: colors.primary }}>
          {formatCoins(game.personalBest)}
        </Text>
        {!playable ? (
          <Text className="mt-0.5 text-[10px]" style={{ color: colors.textMuted }}>
            Soon
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function Games() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeGame, setActiveGame] = useState(null);

  const { data: games, isLoading, error } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
  });

  /** Every game the server scores is now playable. */
  const PLAYABLE = {
    'quick-tap': TapGame,
    'number-rush': NumberRush,
    'emoji-match': EmojiMatch,
    'word-guess': WordGuess,
    'trivia-dash': TriviaDash,
  };

  const isPlayable = (key) => key in PLAYABLE;

  if (activeGame) {
    const Game = PLAYABLE[activeGame.key];
    return <Game game={activeGame} onExit={() => setActiveGame(null)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <View>
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Games
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            Win points, climb the board
          </Text>
        </View>
        <WalletHeader compact />
      </View>

      {isLoading ? (
        <Loading label="Loading games…" />
      ) : error ? (
        <EmptyState emoji="🎮" title="Games are unavailable" description={error.message} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <Pressable
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            className="mb-5"
          >
            <Card className="flex-row items-center gap-3">
              <Text className="text-2xl">🏆</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                  Leaderboard
                </Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  See who is winning across the whole app
                </Text>
              </View>
              <Text className="text-lg" style={{ color: colors.textMuted }}>
                ›
              </Text>
            </Card>
          </Pressable>

          {(games ?? []).map((game) => (
            <GameCard
              key={game.key}
              game={game}
              playable={isPlayable(game.key)}
              onPlay={() => setActiveGame(game)}
            />
          ))}

          <Text className="mt-3 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
            Points are just for the leaderboard — they are not coins, and playing is always free.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
