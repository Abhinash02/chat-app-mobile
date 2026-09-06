import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { CoinIcon } from './CoinIcon.jsx';
import { coinsApi } from '../api/endpoints.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSounds } from '../hooks/useSounds.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useToast } from './Toast.jsx';

/**
 * The daily bonus, offered once the interval is up.
 *
 * Deliberately a decision rather than a notification: claiming credits the
 * coins, and closing declines them and starts the next interval. Both go to the
 * server — dismissing is a real request, not client-side state, so it survives
 * a reinstall and cannot be replayed to farm extra windows.
 *
 * Worth knowing: closing forfeits that window's coins. That is the behaviour
 * asked for, and it is why the close control says what it costs instead of
 * being a bare X in the corner.
 */
export function DailyBonusModal() {
  const { colors, fonts } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { playCoin } = useSounds();
  const toast = useToast();
  const queryClient = useQueryClient();

  /*
   * Closed for the rest of this app session once answered either way.
   *
   * The server has already moved the interval on, so the query would not
   * re-offer it — but the refetch is asynchronous and this keeps the modal from
   * flashing back for the moment in between.
   */
  const [isAnswered, setIsAnswered] = useState(false);

  /*
   * Who the bonus is even for.
   *
   * The server is the authority — it answers `eligible: false` for anyone
   * outside `chargedGenders` — but the question is not worth asking for an
   * account that plainly cannot receive one. Mounted app-wide, this component
   * sits behind the welcome and sign-in screens too, and without the gate it
   * fired an authenticated request every minute at a logged-out visitor and got
   * a 401 back each time.
   */
  const canReceiveBonus = isAuthenticated && user?.gender === 'male';

  const { data: status } = useQuery({
    queryKey: ['daily-bonus'],
    queryFn: () => coinsApi.getDailyBonus(),
    enabled: canReceiveBonus,
    // Checked on a slow tick rather than once: someone who leaves the app open
    // should be offered the bonus when the clock rolls over, not on next launch.
    refetchInterval: 60_000,
  });

  function settle() {
    setIsAnswered(true);
    queryClient.invalidateQueries({ queryKey: ['daily-bonus'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  }

  const claim = useMutation({
    mutationFn: () => coinsApi.claimDailyBonus(),
    onSuccess: (result) => {
      playCoin();
      toast.coins(`${result?.credited ?? status?.amount ?? 0} coins added`);
      settle();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Could not claim that');
      settle();
    },
  });

  const skip = useMutation({
    mutationFn: () => coinsApi.skipDailyBonus(),
    // Nothing is shown on success or failure. The person chose to dismiss this;
    // a toast about it would be the app arguing with them.
    onSettled: () => settle(),
  });

  const isBusy = claim.isPending || skip.isPending;
  const isOpen = Boolean(canReceiveBonus && status?.eligible && status?.isAvailable && !isAnswered);
  const amount = status?.amount ?? 0;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      // Android's back button is a dismissal like any other, so it declines
      // through the same path rather than closing the modal locally.
      onRequestClose={() => !isBusy && skip.mutate()}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17,17,17,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        <View
          style={{
            width: '100%',
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 24,
            paddingTop: 30,
            paddingBottom: 22,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <CoinIcon size={44} />

            <Text
              style={{
                marginTop: 18,
                fontSize: 30,
                letterSpacing: -0.8,
                color: colors.textPrimary,
                fontFamily: fonts?.display,
              }}
            >
              {amount} coins
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 14.5,
                lineHeight: 21,
                textAlign: 'center',
                color: colors.textSecondary,
              }}
            >
              Your daily bonus is ready. Claim it to add the coins to your balance.
            </Text>
          </View>

          <Pressable
            onPress={() => claim.mutate()}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel={`Claim ${amount} coins`}
            style={({ pressed }) => ({
              marginTop: 24,
              backgroundColor: colors.primary,
              paddingVertical: 15,
              borderRadius: 6,
              alignItems: 'center',
              opacity: isBusy ? 0.6 : pressed ? 0.88 : 1,
            })}
          >
            <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: '600' }}>
              {claim.isPending ? 'Claiming…' : 'Claim now'}
            </Text>
          </Pressable>

          {/* Says what it does. A bare X in the corner would hide the fact that
              dismissing gives the coins up for the day. */}
          <Pressable
            onPress={() => skip.mutate()}
            disabled={isBusy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="No thanks, skip today's bonus"
            style={({ pressed }) => ({
              marginTop: 14,
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: isBusy ? 0.4 : pressed ? 0.55 : 1,
            })}
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 13.5, color: colors.textMuted }}>
              No thanks — skip today
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default DailyBonusModal;
