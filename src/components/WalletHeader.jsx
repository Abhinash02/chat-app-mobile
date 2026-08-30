import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { formatCoins, formatFreeTalk } from '../lib/format.js';
import { useSocket } from '../hooks/useSocket.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * The coin counter that sits in the app header.
 *
 * The number itself is pushed over the socket on every charge, credit and
 * bonus — it is never polled, so it moves the instant a message is billed.
 * The free-time readout ticks locally between server updates so it counts down
 * smoothly rather than jumping every fifteen seconds.
 */
export function WalletHeader({ compact = false }) {
  const { colors, radius } = useTheme();
  const { wallet, isConnected, isFreeTalkRunning } = useSocket();

  const serverSeconds = wallet?.freeTalkSecondsRemaining ?? 0;

  const [displaySeconds, setDisplaySeconds] = useState(serverSeconds);
  const [syncedWith, setSyncedWith] = useState(serverSeconds);

  // Adjusting during render rather than in an effect: the server's number is
  // authoritative, and one frame of the old value would visibly stutter a
  // counter the user is watching tick.
  if (syncedWith !== serverSeconds) {
    setSyncedWith(serverSeconds);
    setDisplaySeconds(serverSeconds);
  }

  /*
   * The countdown only moves while the allowance is actually being spent —
   * a chat open, in the foreground, with the server billing heartbeats.
   *
   * It used to tick everywhere, all the time. Sitting on the Discover screen
   * watched the free minutes drain away without a word being sent, and the
   * number sprang back up whenever the server corrected it. The allowance is a
   * stored balance, not a countdown from signup: it is spent by talking, and
   * closing the app pauses it rather than burning it.
   *
   * Ticking here is still only cosmetic. The server owns the balance and
   * corrects this on every heartbeat, so local drift can never cost anyone
   * time.
   */
  useEffect(() => {
    if (displaySeconds <= 0 || !isFreeTalkRunning) return undefined;

    const timer = setInterval(() => setDisplaySeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [displaySeconds > 0, isFreeTalkRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!wallet) return null;

  if (wallet.isUnlimited) {
    return (
      <View
        className="flex-row items-center gap-1.5 px-3 py-1.5"
        style={{ backgroundColor: `${colors.success}1F`, borderRadius: radius }}
      >
        <Text className="text-xs">💬</Text>
        <Text className="text-xs font-semibold" style={{ color: colors.success }}>
          Unlimited
        </Text>
      </View>
    );
  }

  const isFreeTime = displaySeconds > 0;
  const isLow = !isFreeTime && wallet.coinBalance < (wallet.pricing?.coinsPerBlock ?? 10);

  return (
    <Pressable
      onPress={() => router.push('/coins')}
      accessibilityRole="button"
      accessibilityLabel={
        isFreeTime
          ? `${formatFreeTalk(displaySeconds)} of free chat left`
          : `${wallet.coinBalance} coins. Tap to buy more.`
      }
      className="flex-row items-center gap-1.5 px-3 py-1.5"
      style={({ pressed }) => ({
        backgroundColor: isLow ? `${colors.danger}1F` : `${colors.coinGold}22`,
        borderRadius: radius,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {isFreeTime ? (
        <>
          <Text className="text-xs">⏳</Text>
          <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
            {formatFreeTalk(displaySeconds)} free
          </Text>
        </>
      ) : (
        <>
          <Text className="text-xs">🪙</Text>
          <Text
            className="text-sm font-bold"
            style={{ color: isLow ? colors.danger : colors.textPrimary }}
          >
            {formatCoins(wallet.coinBalance)}
          </Text>
          {!compact && wallet.estimatedMessagesRemaining !== null ? (
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              · {wallet.estimatedMessagesRemaining} msg
            </Text>
          ) : null}
        </>
      )}

      {/* A stale counter is worse than an obviously offline one. */}
      {!isConnected ? (
        <View
          className="ml-0.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: colors.textMuted }}
          accessibilityLabel="Reconnecting"
        />
      ) : null}
    </Pressable>
  );
}
