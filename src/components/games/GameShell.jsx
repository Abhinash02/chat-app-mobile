import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, GradientButton } from '../ui.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * The frame every mini game shares: a way out, a live stat bar, and the
 * before/after screens. Only the middle changes per game, which keeps a new
 * game to its own rules rather than its own chrome.
 */
export function GameShell({
  title,
  phase,
  result,
  onExit,
  onStart,
  isStarting,
  howToPlay,
  stats,
  children,
}) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Leave the game">
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            ✕ Leave
          </Text>
        </Pressable>

        <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
          {title}
        </Text>

        <View style={{ width: 60 }} />
      </View>

      {phase === 'playing' && stats ? (
        <View className="flex-row justify-center gap-8 pb-3">
          {stats.map((stat) => (
            <View key={stat.label} className="items-center">
              <Text className="text-2xl font-bold" style={{ color: stat.color ?? colors.textPrimary }}>
                {stat.value}
              </Text>
              <Text className="text-[11px] uppercase" style={{ color: colors.textMuted }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {phase === 'ready' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-3 text-5xl">{howToPlay.emoji}</Text>
          <Text className="mb-2 text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {title}
          </Text>
          <Text
            className="mb-8 text-center text-sm leading-relaxed"
            style={{ color: colors.textSecondary }}
          >
            {howToPlay.text}
          </Text>
          <GradientButton
            title={isStarting ? 'Starting…' : 'Start'}
            onPress={onStart}
            isLoading={isStarting}
          />
        </View>
      ) : null}

      {phase === 'playing' ? <View className="flex-1">{children}</View> : null}

      {phase === 'submitting' ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base" style={{ color: colors.textMuted }}>
            Saving your score…
          </Text>
        </View>
      ) : null}

      {phase === 'finished' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-5xl">{result?.pointsAwarded > 0 ? '🎉' : '👏'}</Text>

          <Card className="w-full items-center py-6">
            <Text className="text-xs uppercase" style={{ color: colors.textMuted }}>
              Your score
            </Text>
            <Text className="text-5xl font-bold" style={{ color: colors.primary }}>
              {result?.score ?? 0}
            </Text>

            {result ? (
              <View className="mt-4 flex-row gap-8">
                <View className="items-center">
                  <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                    +{result.pointsAwarded}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                    points
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                    #{result.rank}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                    rank
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>

          <View className="mt-6 w-full gap-3">
            <GradientButton title="Play again" onPress={onStart} isLoading={isStarting} />
            <Pressable
              onPress={onExit}
              accessibilityRole="button"
              className="items-center py-3"
              style={{ borderRadius: radius }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                Back to games
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
