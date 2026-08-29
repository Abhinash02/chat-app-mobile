import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge, Button, Card, Field, GradientButton, Input, Loading } from '../src/components/ui.jsx';
import { coinsApi, paymentsApi } from '../src/api/endpoints.js';
import { formatCoins, formatCountdown, formatRupees } from '../src/lib/format.js';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

/**
 * The 24-hour timer, ticking locally between server updates.
 *
 * The server sends the milliseconds remaining; counting down here is what makes
 * it feel live rather than refreshing in jumps. The server's number always wins
 * on the next fetch, so local drift can never grant an early claim.
 */
function DailyBonusCard() {
  const { colors, radius } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: bonus, isLoading } = useQuery({
    queryKey: ['daily-bonus'],
    queryFn: coinsApi.dailyBonus,
    refetchInterval: 60_000,
  });

  const serverRemaining = bonus?.msRemaining ?? 0;

  const [remaining, setRemaining] = useState(serverRemaining);
  const [syncedWith, setSyncedWith] = useState(serverRemaining);

  // The server's figure is authoritative; the local tick between fetches only
  // makes the countdown move smoothly.
  if (syncedWith !== serverRemaining) {
    setSyncedWith(serverRemaining);
    setRemaining(serverRemaining);
  }

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1000)), 1000);
    return () => clearInterval(timer);
  }, [remaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const claim = useMutation({
    mutationFn: coinsApi.claimDailyBonus,
    onSuccess: (result) => {
      toast.coins(`+${result.credited} coins claimed!`);
      queryClient.invalidateQueries({ queryKey: ['daily-bonus'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (error) => toast.error(error.message ?? 'Could not claim your bonus'),
  });

  if (isLoading || !bonus?.eligible) return null;

  const isReady = remaining <= 0;

  return (
    <Card className="mb-5" style={{ borderColor: isReady ? colors.coinGold : colors.border }}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.coinGold}22` }}
        >
          <Text className="text-2xl">🎁</Text>
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            Daily bonus
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {isReady
              ? `${bonus.amount} free coins are waiting`
              : `Next ${bonus.amount} coins in ${formatCountdown(remaining)}`}
          </Text>
        </View>

        {isReady ? (
          <Button
            title="Claim"
            size="sm"
            isLoading={claim.isPending}
            onPress={() => claim.mutate()}
          />
        ) : (
          <View
            className="px-3 py-1.5"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-sm font-bold" style={{ color: colors.textSecondary }}>
              {formatCountdown(remaining)}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

function PackageCard({ coinPackage, selected, onSelect }) {
  const { colors, radius } = useTheme();
  const isSelected = selected === coinPackage.id;

  return (
    <Pressable
      onPress={() => onSelect(coinPackage.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${coinPackage.totalCoins} coins for ${formatRupees(coinPackage.priceInRupees)}`}
      className="mb-3 flex-row items-center gap-3 p-4"
      style={{
        backgroundColor: isSelected ? `${colors.primary}0F` : colors.surface,
        borderRadius: radius,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.primary : colors.border,
      }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${colors.coinGold}22` }}
      >
        <Text className="text-xl">🪙</Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
            {formatCoins(coinPackage.totalCoins)} coins
          </Text>
          {coinPackage.bonusCoins > 0 ? (
            <Badge label={`+${coinPackage.bonusCoins} free`} tone="success" />
          ) : null}
          {coinPackage.isPopular ? <Badge label="Popular" tone="brand" /> : null}
        </View>

        <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
          {coinPackage.description || coinPackage.name}
        </Text>
      </View>

      <Text className="text-lg font-bold" style={{ color: colors.primary }}>
        {formatRupees(coinPackage.priceInRupees)}
      </Text>
    </Pressable>
  );
}

/**
 * Direct UPI: the user pays, then tells us the reference. Coins arrive once an
 * administrator confirms the transfer — the screen says so plainly rather than
 * implying it is instant.
 */
function UpiFlow({ order, upi, onDone }) {
  const { colors, radius } = useTheme();
  const toast = useToast();
  const [utr, setUtr] = useState('');

  const submit = useMutation({
    mutationFn: () => paymentsApi.submitProof(order.id, { utr: utr.trim() }),
    onSuccess: () => {
      toast.success('Sent for confirmation — coins arrive once we verify it');
      onDone();
    },
    onError: (error) => toast.error(error.message ?? 'Could not submit that reference'),
  });

  async function openUpiApp() {
    try {
      const canOpen = await Linking.canOpenURL(upi.intentUrl);

      if (!canOpen) {
        // No UPI app installed. Copying the ID is the next best thing.
        await Clipboard.setStringAsync(upi.upiId);
        toast.info('UPI ID copied — paste it into your payment app');
        return;
      }

      await Linking.openURL(upi.intentUrl);
    } catch {
      await Clipboard.setStringAsync(upi.upiId);
      toast.info('UPI ID copied to your clipboard');
    }
  }

  return (
    <Card className="mt-2">
      <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
        Pay {formatRupees(order.amountInRupees)}
      </Text>
      <Text className="mt-1 text-sm leading-5" style={{ color: colors.textMuted }}>
        {upi.instructions}
      </Text>

      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(upi.upiId);
          toast.success('UPI ID copied');
        }}
        className="mt-4 flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
      >
        <View>
          <Text className="text-[11px]" style={{ color: colors.textMuted }}>
            Pay to
          </Text>
          <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            {upi.upiId}
          </Text>
        </View>
        <Text className="text-sm font-medium" style={{ color: colors.primary }}>
          Copy
        </Text>
      </Pressable>

      <GradientButton title="Open a UPI app" className="mt-3" onPress={openUpiApp} />

      <View className="my-4 h-px" style={{ backgroundColor: colors.border }} />

      <Field
        label="UTR reference"
        hint="The 12-digit number your bank app shows after the transfer."
      >
        <Input
          value={utr}
          onChangeText={setUtr}
          placeholder="e.g. 402912345678"
          autoCapitalize="characters"
          maxLength={30}
        />
      </Field>

      <Button
        title="I have paid"
        isLoading={submit.isPending}
        disabled={utr.trim().length < 8}
        onPress={() => submit.mutate()}
      />
    </Card>
  );
}

export default function Coins() {
  const { colors } = useTheme();
  const { wallet } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  const { data: options, isLoading } = useQuery({
    queryKey: ['payment-options'],
    queryFn: paymentsApi.options,
  });

  // Preselect the pack the product is pushing, so one tap completes the flow.
  // Derived rather than stored until the user actually chooses one.
  const defaultPackageId =
    options?.packages?.find((item) => item.isPopular)?.id ?? options?.packages?.[0]?.id ?? null;
  const activePackageId = selectedId ?? defaultPackageId;

  const createUpiOrder = useMutation({
    mutationFn: () => paymentsApi.createUpiOrder(activePackageId),
    onSuccess: (result) => setActiveOrder(result),
    onError: (error) => toast.error(error.message ?? 'Could not start that payment'),
  });

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label="Loading coin packs…" />
      </View>
    );
  }

  const canPayByUpi = options?.methods?.manualUpi;
  const canPayOnline = options?.methods?.razorpay;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          Get coins
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" className="p-2">
          <Text className="text-xl" style={{ color: colors.textSecondary }}>
            ✕
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Card className="mb-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                Your balance
              </Text>
              <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
                {formatCoins(wallet?.coinBalance ?? 0)} 🪙
              </Text>
            </View>

            {wallet && !wallet.isUnlimited ? (
              <View className="items-end">
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  That is about
                </Text>
                <Text className="text-base font-semibold" style={{ color: colors.textSecondary }}>
                  {wallet.estimatedMessagesRemaining} messages
                </Text>
              </View>
            ) : null}
          </View>

          {wallet && !wallet.isUnlimited ? (
            <Text className="mt-3 text-xs" style={{ color: colors.textMuted }}>
              {wallet.pricing.messagesPerBlock} messages cost {wallet.pricing.coinsPerBlock} coins.
            </Text>
          ) : null}
        </Card>

        <DailyBonusCard />

        {activeOrder ? (
          <UpiFlow
            order={activeOrder.order}
            upi={activeOrder.upi}
            onDone={() => {
              setActiveOrder(null);
              router.back();
            }}
          />
        ) : (
          <>
            <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
              Choose a pack
            </Text>

            {options?.packages?.map((coinPackage) => (
              <PackageCard
                key={coinPackage.id}
                coinPackage={coinPackage}
                selected={activePackageId}
                onSelect={setSelectedId}
              />
            ))}

            {options?.packages?.length === 0 ? (
              <Card>
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  No coin packs are on sale right now. Please check back later.
                </Text>
              </Card>
            ) : null}

            <View className="mt-4 gap-2">
              {canPayByUpi ? (
                <GradientButton
                  title="Pay by UPI"
                  isLoading={createUpiOrder.isPending}
                  disabled={!activePackageId}
                  onPress={() => createUpiOrder.mutate()}
                />
              ) : null}

              {canPayOnline ? (
                <Button
                  title="Pay by card or netbanking"
                  variant="outline"
                  onPress={() =>
                    // Razorpay's checkout needs its native SDK, which a managed
                    // Expo build cannot load. Saying so beats a button that
                    // silently does nothing.
                    toast.info('Card payment opens in the next app update. UPI works now.')
                  }
                />
              ) : null}

              {!canPayByUpi && !canPayOnline ? (
                <Card>
                  <Text className="text-sm" style={{ color: colors.textMuted }}>
                    Payments are not set up yet. Contact {options?.supportEmail ?? 'support'} if you
                    need coins.
                  </Text>
                </Card>
              ) : null}
            </View>

            <Text className="mt-5 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
              Coins never expire. Girls chat free and unlimited, so they never need to buy any.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
