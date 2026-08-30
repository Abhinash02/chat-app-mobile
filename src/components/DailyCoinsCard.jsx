import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { coinsApi } from '../api/endpoints.js';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useToast } from './Toast.jsx';

/** "11h 33m 15s" — the seconds are what make it feel live. */
function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/**
 * The daily bonus, with a live countdown to the next one.
 *
 * The deadline comes from the server and the countdown is derived from it
 * locally, so the ticking costs nothing and a phone with a skewed clock still
 * unlocks at the right moment — the claim itself is checked server-side.
 */
export function DailyCoinsCard() {
  const { colors, radius } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['daily-bonus'],
    queryFn: () => coinsApi.getDailyBonus(),
    refetchInterval: 60_000,
  });

  /*
   * The wall clock is an external system, so subscribing to it from an effect
   * is exactly what effects are for. Reading `Date.now()` during render would
   * be impure — the same render would produce a different result each time.
   *
   * The first update is scheduled rather than called inline: setting state
   * synchronously inside an effect triggers a second render pass, and a zero
   * delay is imperceptible while keeping the countdown from flashing blank.
   */
  const [remaining, setRemaining] = useState(0);
  const deadline = status?.nextAvailableAt ? new Date(status.nextAvailableAt).getTime() : null;

  useEffect(() => {
    if (!deadline) return undefined;

    const update = () => setRemaining(deadline - Date.now());

    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 1000);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [deadline]);

  const claim = useMutation({
    mutationFn: () => coinsApi.claimDailyBonus(),
    onSuccess: (result) => {
      toast.coins(`${result.credited} coins added`);
      queryClient.invalidateQueries({ queryKey: ['daily-bonus'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (error) => toast.error(error.message ?? 'Could not claim yet'),
  });

  // Girls are never charged, so a bonus would be meaningless to them.
  if (!status?.eligible) return null;

  const isReady = status.isAvailable || remaining <= 0;

  return (
    <View
      className="mb-4 p-4"
      style={{
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius + 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        className="mb-3 text-xs font-bold uppercase"
        style={{ color: colors.textSecondary, letterSpacing: 1.2 }}
      >
        ✦ Daily free coins
      </Text>

      <View className="flex-row items-center gap-3">
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.coinGold }}
        >
          <Text style={{ fontSize: 26 }}>🪙</Text>
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {status.amount} coins
          </Text>
          <Text className="text-sm font-medium" style={{ color: isReady ? colors.success : colors.textMuted }}>
            {isReady ? 'ready to claim' : 'claimed'}
          </Text>
        </View>

        {isReady ? (
          <Pressable
            onPress={() => claim.mutate()}
            disabled={claim.isPending}
            accessibilityRole="button"
            className="px-5 py-3"
            style={{ backgroundColor: colors.primary, borderRadius: radius, opacity: claim.isPending ? 0.6 : 1 }}
          >
            <Text className="text-sm font-bold" style={{ color: colors.onPrimary }}>
              {claim.isPending ? 'Claiming…' : 'Claim'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!isReady ? (
        <View
          className="mt-3 flex-row items-center justify-center gap-2 py-2.5"
          style={{ backgroundColor: colors.surface, borderRadius: radius }}
        >
          <Text style={{ fontSize: 13 }}>🕐</Text>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            Next reward in{' '}
            <Text className="font-bold" style={{ color: colors.textPrimary }}>
              {formatCountdown(remaining)}
            </Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}
