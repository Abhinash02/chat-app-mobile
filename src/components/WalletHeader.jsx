import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { CoinIcon } from './CoinIcon.jsx';
import { formatCoins, formatFreeTalk } from '../lib/format.js';
import { useAuth } from '../hooks/useAuth.jsx';
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
export function WalletHeader({ compact = false, showTimer = false }) {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { wallet, isConnected, isFreeTalkRunning } = useSocket();

  const isGirl =
    String(user?.gender).toLowerCase() === 'female' ||
    String(user?.gender).toLowerCase() === 'girl';

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

  if (isGirl && wallet.isUnlimited) {
    return (
      <Pressable
        onPress={() => router.push('/coins')}
        accessibilityRole="button"
        accessibilityLabel="Chat Earnings & Cashout. Tap to view and withdraw."
        className="flex-row items-center gap-1.5 px-3 py-1.5 active:scale-95 transition"
        style={({ pressed }) => ({
          backgroundColor: `${colors.primary}1F`,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: `${colors.primary}44`,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <CoinIcon size={16} />
        <Text className="text-xs font-bold" style={{ color: colors.primary }}>
          {formatCoins(wallet.coinBalance)}
        </Text>
        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
          · 💸 Cashout
        </Text>
      </Pressable>
    );
  }

  const isFreeTime = displaySeconds > 0;
  const isLow = !isFreeTime && wallet.coinBalance < (wallet.pricing?.coinsPerBlock ?? 10);

  return (
    <Pressable
      onPress={() => router.push('/coins')}
      accessibilityRole="button"
      accessibilityLabel={`${wallet.coinBalance} coins. Tap to buy more.`}
      className="flex-row items-center gap-1.5 px-3 py-1.5"
      style={({ pressed }) => ({
        backgroundColor: isLow ? `${colors.danger}1F` : `${colors.coinGold}22`,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: isLow ? `${colors.danger}40` : `${colors.coinGold}40`,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <CoinIcon size={16} />
      <Text
        className="text-sm font-bold"
        style={{ color: isLow ? colors.danger : colors.textPrimary }}
      >
        {formatCoins(wallet.coinBalance)}
      </Text>

      {showTimer && isFreeTime ? (
        <Text className="text-[11px] font-semibold" style={{ color: colors.primary }}>
          · ⏳ {formatFreeTalk(displaySeconds)}
        </Text>
      ) : showTimer && !compact && wallet.estimatedMessagesRemaining !== null ? (
        <Text className="text-[11px]" style={{ color: colors.textMuted }}>
          · {wallet.estimatedMessagesRemaining} msg
        </Text>
      ) : null}

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
