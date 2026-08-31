import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, Field, GradientButton, Input, Loading } from '../src/components/ui.jsx';
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

function RedeemCouponCard({ onDiscountApplied, appliedCoupon, onClearCoupon }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const redeem = useMutation({
    mutationFn: (promoCode) => paymentsApi.redeemCode(promoCode),
    onSuccess: (res) => {
      if (res.rewardType === 'free_coins') {
        toast.coins(res.message || `+${res.coinsCredited} coins added to wallet!`);
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        setCode('');
      } else {
        toast.success(res.message || 'Discount coupon applied!');
        onDiscountApplied({
          code: code.trim().toUpperCase(),
          rewardType: res.rewardType,
          discountPercent: res.discountPercent,
          discountAmountInRupees: res.discountAmountInRupees,
        });
      }
    },
    onError: (error) => toast.error(error.message ?? 'Invalid or expired promo code'),
  });

  return (
    <Card className="mb-5" style={{ borderColor: appliedCoupon ? colors.success : colors.border }}>
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
          🎁 Redeem Code or Discount Coupon
        </Text>
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
        Enter an admin promo code for free bonus coins or instant package discounts.
      </Text>

      {appliedCoupon ? (
        <View
          className="flex-row items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: `${colors.success}15`, borderWidth: 1, borderColor: colors.success }}
        >
          <View>
            <Text className="text-xs font-bold text-emerald-600">
              ✓ COUPON APPLIED: {appliedCoupon.code}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
              {appliedCoupon.rewardType === 'discount_percent'
                ? `${appliedCoupon.discountPercent}% OFF on all packs`
                : `₹${appliedCoupon.discountAmountInRupees} OFF on all packs`}
            </Text>
          </View>
          <Pressable onPress={onClearCoupon} className="px-2.5 py-1 rounded-lg bg-red-500/10">
            <Text className="text-xs font-semibold text-red-600">Remove</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <Input
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="e.g. DIWALI100"
              autoCapitalize="characters"
              maxLength={25}
            />
          </View>
          <Button
            title="Redeem"
            size="sm"
            isLoading={redeem.isPending}
            disabled={!code.trim()}
            onPress={() => redeem.mutate(code.trim().toUpperCase())}
          />
        </View>
      )}
    </Card>
  );
}

function PackageCard({ coinPackage, selected, onSelect, appliedCoupon }) {
  const { colors, radius } = useTheme();
  const isSelected = selected === coinPackage.id;

  let finalPrice = coinPackage.priceInRupees;
  if (appliedCoupon) {
    if (appliedCoupon.rewardType === 'discount_percent' && appliedCoupon.discountPercent > 0) {
      finalPrice = Math.max(1, Math.round(coinPackage.priceInRupees * (1 - appliedCoupon.discountPercent / 100)));
    } else if (appliedCoupon.rewardType === 'discount_flat' && appliedCoupon.discountAmountInRupees > 0) {
      finalPrice = Math.max(1, coinPackage.priceInRupees - appliedCoupon.discountAmountInRupees);
    }
  }

  const hasDiscount = finalPrice < coinPackage.priceInRupees;

  return (
    <Pressable
      onPress={() => onSelect(coinPackage.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${coinPackage.totalCoins} coins for ${formatRupees(finalPrice)}`}
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
        <CoinIcon size={24} />
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
          {hasDiscount ? <Badge label="Discounted" tone="warning" /> : null}
        </View>

        <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
          {coinPackage.description || coinPackage.name}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-lg font-bold" style={{ color: colors.primary }}>
          {formatRupees(finalPrice)}
        </Text>
        {hasDiscount && (
          <Text className="text-xs line-through" style={{ color: colors.textMuted }}>
            {formatRupees(coinPackage.priceInRupees)}
          </Text>
        )}
      </View>
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
  const [appliedCoupon, setAppliedCoupon] = useState(null);

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
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Close" className="p-2">
          <Text className="text-xl" style={{ color: colors.textSecondary }}>
            ✕
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {/* Events & Offers Banner */}
        <Pressable
          onPress={() => router.push('/events')}
          className="mb-4 flex-row items-center justify-between p-3.5 rounded-2xl"
          style={{ backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30` }}
        >
          <View className="flex-row items-center gap-2.5">
            <Text className="text-xl">🎉</Text>
            <View>
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                Live Offers & Festival Events
              </Text>
              <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                Check free chat hours and limited-time coin drops
              </Text>
            </View>
          </View>
          <Text className="text-xs font-bold" style={{ color: colors.primary }}>
            View →
          </Text>
        </Pressable>

        <Card className="mb-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                Your balance
              </Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <CoinIcon size={24} />
                <Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
                  {formatCoins(wallet?.coinBalance ?? 0)}
                </Text>
              </View>
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

        <RedeemCouponCard
          appliedCoupon={appliedCoupon}
          onDiscountApplied={setAppliedCoupon}
          onClearCoupon={() => setAppliedCoupon(null)}
        />

        {activeOrder ? (
          <UpiFlow
            order={activeOrder.order}
            upi={activeOrder.upi}
            onDone={() => {
              setActiveOrder(null);
              goBack();
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
                appliedCoupon={appliedCoupon}
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

            <View className="mt-3 flex-row items-center justify-center gap-3">
              <Pressable onPress={() => router.push('/terms')}>
                <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                  Terms of Use
                </Text>
              </Pressable>
              <Text style={{ color: colors.textMuted }}>•</Text>
              <Pressable onPress={() => router.push('/refund')}>
                <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                  Refund Policy
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
