import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, Field, GradientButton, Input, Loading } from '../src/components/ui.jsx';
import { coinsApi, paymentsApi } from '../src/api/endpoints.js';
import { formatCoins, formatCountdown, formatRupees } from '../src/lib/format.js';
import { launchCashfreeCheckout } from '../src/lib/cashfree.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

/**
 * The 24-hour timer, ticking locally between server updates.
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

  if (syncedWith !== serverRemaining) {
    setSyncedWith(serverRemaining);
    setRemaining(serverRemaining);
  }

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1000)), 1000);
    return () => clearInterval(timer);
  }, [remaining > 0]);

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

function UpiFlow({ order, upi, onDone }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);

  const notify = useMutation({
    mutationFn: () => paymentsApi.submitProof(order.id, {}),
    onSuccess: () => {
      setSubmitted(true);
      toast.coins('✅ Payment notified! Your coins will be credited once verified.');
      setTimeout(() => onDone(), 2200);
    },
    onError: (error) => toast.error(error.message ?? 'Could not notify. Please try again.'),
  });

  const openGPay = async () => {
    if (!upi?.intentUrl) {
      toast.error('No payment link available. Copy the UPI ID and pay manually.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(upi.intentUrl);
      if (canOpen) {
        await Linking.openURL(upi.intentUrl);
      } else {
        // Fallback: open generic UPI intent
        const fallbackUrl = `upi://pay?pa=${upi.upiId}&pn=${encodeURIComponent(upi.payeeName || 'Vibe Chat')}&am=${upi.amountInRupees}&tn=VibeChatCoins&cu=INR`;
        await Linking.openURL(fallbackUrl);
      }
    } catch {
      toast.error('No UPI app found. Copy the UPI ID and pay manually.');
    }
  };

  if (submitted) {
    return (
      <Card className="mb-5 p-6 items-center" style={{ backgroundColor: colors.surface }}>
        <Text className="text-5xl mb-3">✅</Text>
        <Text className="text-base font-black text-center mb-1" style={{ color: colors.textPrimary }}>
          Payment Notified!
        </Text>
        <Text className="text-xs text-center" style={{ color: colors.textMuted }}>
          Our team will verify your payment and credit your coins shortly. You will receive a notification.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="mb-5 p-4" style={{ borderColor: `${colors.primary}40`, backgroundColor: colors.surface }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
        <View
          className="h-11 w-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: `${colors.primary}18` }}
        >
          <Text className="text-2xl">📱</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-black" style={{ color: colors.textPrimary }}>
            Pay via UPI
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            GPay · PhonePe · Paytm · Any UPI App
          </Text>
        </View>
      </View>

      {/* Amount Highlight */}
      <View
        className="rounded-2xl p-4 mb-4 items-center"
        style={{ backgroundColor: `${colors.success}12`, borderWidth: 1.5, borderColor: `${colors.success}40` }}
      >
        <Text className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>
          Amount to Pay
        </Text>
        <Text className="text-4xl font-black" style={{ color: colors.success }}>
          {formatRupees(upi?.amountInRupees || order?.amountInRupees || 0)}
        </Text>
        <View className="flex-row items-center gap-1 mt-2">
          <CoinIcon size={14} />
          <Text className="text-sm font-bold" style={{ color: colors.coinGold }}>
            +{formatCoins(order?.totalCoins || order?.coins || 0)} coins will be credited
          </Text>
        </View>
      </View>

      {/* UPI ID box — selectable, full-width copy bar */}
      <View
        className="rounded-2xl mb-4 overflow-hidden border"
        style={{ borderColor: colors.border }}
      >
        <View className="px-4 pt-3 pb-2" style={{ backgroundColor: colors.surfaceAlt }}>
          <Text className="text-[11px] mb-1" style={{ color: colors.textMuted }}>
            Pay to: {upi?.payeeName || 'Vibe Chat'}
          </Text>
          <Text
            className="text-base font-mono font-black"
            style={{ color: colors.textPrimary }}
            selectable
          >
            {upi?.upiId || 'support@upi'}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            if (upi?.upiId) {
              await Clipboard.setStringAsync(upi.upiId);
              toast.success('UPI ID copied!');
            }
          }}
          className="flex-row items-center justify-center py-2.5"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          <Text className="text-xs font-bold" style={{ color: colors.primary }}>📋  Tap to Copy UPI ID</Text>
        </Pressable>
      </View>

      {/* Open UPI App — primary CTA */}
      <GradientButton
        title="⚡  Open GPay / PhonePe / Paytm"
        onPress={openGPay}
      />

      {/* Divider */}
      <View className="flex-row items-center gap-3 my-4">
        <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
        <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>After paying</Text>
        <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
      </View>

      {/* Notify Admin button */}
      <Button
        title="✅  I've Paid — Notify Admin"
        variant="outline"
        isLoading={notify.isPending}
        onPress={() => notify.mutate()}
      />

      <Button
        title="Cancel"
        variant="ghost"
        className="mt-2"
        onPress={onDone}
      />

      {/* Info note */}
      <View
        className="mt-4 flex-row items-start gap-2 p-3 rounded-xl"
        style={{ backgroundColor: `${colors.primary}10` }}
      >
        <Text className="text-base">ℹ️</Text>
        <Text className="text-[11px] leading-4 flex-1" style={{ color: colors.textSecondary }}>
          After tapping "I've Paid", our team will verify and credit your coins automatically. Usually within a few minutes.
        </Text>
      </View>
    </Card>
  );
}

export default function Coins() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { wallet } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  const [selectedId, setSelectedId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    if (params?.payment === 'success' || params?.status === 'success') {
      toast.coins('🎉 Payment Successful! Coins have been added to your wallet.');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setActiveOrder(null);
    }
  }, [params?.payment, params?.status]);

  const { data: options, isLoading } = useQuery({
    queryKey: ['payment-options'],
    queryFn: paymentsApi.options,
  });

  const defaultPackageId =
    options?.packages?.find((item) => item.isPopular)?.id ?? options?.packages?.[0]?.id ?? null;
  const activePackageId = selectedId ?? defaultPackageId;

  const canPayByUpi = options?.methods?.manualUpi;
  const canPayCashfree = options?.methods?.cashfree || options?.cashfree?.isConfigured;
  const canPayOnline = options?.methods?.razorpay;

  const createUpiOrder = useMutation({
    mutationFn: () => paymentsApi.createUpiOrder(activePackageId),
    onSuccess: (result) => setActiveOrder(result),
    onError: (error) => toast.error(error.message ?? 'Could not start UPI payment'),
  });

  const createCashfreeOrder = useMutation({
    mutationFn: () => paymentsApi.createCashfreeOrder(activePackageId),
    onSuccess: async (result) => {
      const checkout = result?.checkout;
      if (!checkout) return;

      toast.info('Opening Cashfree Payment Gateway...');

      await launchCashfreeCheckout({
        paymentSessionId: checkout.paymentSessionId,
        environment: checkout.environment,
      }).catch(() => undefined);

      setActiveOrder({
        isCashfree: true,
        order: result.order,
        checkout,
      });
    },
    onError: (error) => toast.error(error.message ?? 'Could not start Cashfree payment'),
  });

  const verifyCashfree = useMutation({
    mutationFn: (orderId) => paymentsApi.verifyCashfree(orderId),
    onSuccess: (result) => {
      if (result.alreadyCredited || result.status === 'paid' || result.order?.status === 'paid') {
        toast.coins('Payment Verified! Coins credited to your wallet 🎉');
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['my-profile'] });
        setActiveOrder(null);
      } else {
        toast.info(`Payment status: ${result.cashfreeStatus || result.status || 'PENDING'}`);
      }
    },
    onError: (error) => toast.error(error.message ?? 'Could not verify payment yet'),
  });

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label="Loading coin packs…" />
      </View>
    );
  }

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
          className="mb-4 p-3.5 rounded-2xl"
          style={{ backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30` }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <Text className="text-lg">🎉</Text>
              <View className="flex-1">
                <Text
                  className="text-xs font-bold"
                  style={{ color: colors.primary }}
                  numberOfLines={1}
                >
                  Live Offers & Festival Events
                </Text>
                <Text
                  className="text-[11px] mt-0.5"
                  style={{ color: colors.textMuted }}
                  numberOfLines={2}
                >
                  Free chat hours & limited-time coin drops
                </Text>
              </View>
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${colors.primary}22` }}
            >
              <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>View →</Text>
            </View>
          </View>
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
            <View className="mt-3 flex-row items-center justify-between border-t pt-2" style={{ borderTopColor: colors.border }}>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                Chat rate
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                {wallet.messagesPerBlock} messages / {wallet.coinsPerBlock} coins
              </Text>
            </View>
          ) : null}
        </Card>

        {activeOrder?.isCashfree ? (
          <Card className="mb-5 p-4" style={{ borderColor: `${colors.primary}40`, backgroundColor: colors.surface }}>
            {/* Header — stacked so badge never clips */}
            <View className="mb-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
              <View className="flex-row items-center gap-2.5 mb-2">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}18` }}
                >
                  <Text className="text-xl">⚡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                    Cashfree Payment
                  </Text>
                  <Text
                    className="text-[11px] font-mono"
                    style={{ color: colors.textMuted }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    Ref: {activeOrder.order?.id}
                  </Text>
                </View>
              </View>
              <View
                className="self-start px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${colors.primary}18` }}
              >
                <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>⏳ IN PROGRESS</Text>
              </View>
            </View>

            {/* Bill & Invoice Breakdown Box */}
            <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.primary }}>
                🧾 Order & Billing Details
              </Text>

              {/* Package Name */}
              <View className="flex-row items-center justify-between py-2 border-b border-dashed" style={{ borderBottomColor: `${colors.border}80` }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Package</Text>
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  {activeOrder.order?.packageName || activeOrder.checkout?.packageName || 'Coins Bundle'}
                </Text>
              </View>

              {/* Coins to Receive */}
              <View className="flex-row items-center justify-between py-2 border-b border-dashed" style={{ borderBottomColor: `${colors.border}80` }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Coins Credited</Text>
                <View className="flex-row items-center gap-1.5">
                  <CoinIcon size={14} />
                  <Text className="text-xs font-bold" style={{ color: colors.coinGold }}>
                    +{activeOrder.order?.totalCoins || activeOrder.order?.coins} Coins
                  </Text>
                </View>
              </View>

              {/* User / Billed To */}
              <View className="flex-row items-center justify-between py-2 border-b border-dashed" style={{ borderBottomColor: `${colors.border}80` }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Billed To</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                  {user?.name || user?.nickname || 'Vibe User'}
                </Text>
              </View>

              {/* Account Email */}
              <View className="flex-row items-center justify-between py-2 border-b border-dashed" style={{ borderBottomColor: `${colors.border}80` }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Account Email</Text>
                <Text className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                  {user?.email || 'user@vibechat.app'}
                </Text>
              </View>

              {/* Payment Gateway */}
              <View className="flex-row items-center justify-between py-2 border-b border-dashed" style={{ borderBottomColor: `${colors.border}80` }}>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Payment Gateway</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                  Cashfree PG ({activeOrder.checkout?.environment === 'sandbox' ? 'Sandbox' : 'Production'})
                </Text>
              </View>

              {/* Total Payable Price */}
              <View className="flex-row items-center justify-between pt-3 mt-1">
                <Text className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                  Total Payable Amount
                </Text>
                <Text className="text-xl font-black" style={{ color: colors.primary }}>
                  {formatRupees(activeOrder.order?.amountInRupees || activeOrder.checkout?.amountInRupees || 0)}
                </Text>
              </View>
            </View>

            {/* Instruction Notice */}
            <View className="p-3 rounded-xl mb-4 flex-row items-center gap-2.5" style={{ backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}25` }}>
              <Text className="text-base">🔒</Text>
              <Text className="text-[11px] leading-4 flex-1" style={{ color: colors.textSecondary }}>
                Complete payment via UPI (GPay, PhonePe, Paytm), Card, or NetBanking. Once paid, click below to verify and receive your coins instantly!
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-2.5">
              <GradientButton
                title="Verify Payment & Add Coins"
                isLoading={verifyCashfree.isPending}
                onPress={() => verifyCashfree.mutate(activeOrder.order?.id)}
              />
              <Button
                title="Reopen Payment Window"
                variant="outline"
                onPress={() => {
                  const checkout = activeOrder?.checkout;
                  if (checkout) {
                    launchCashfreeCheckout({
                      paymentSessionId: checkout.paymentSessionId,
                      environment: checkout.environment,
                    }).catch(() => undefined);
                  }
                }}
              />
              <Button
                title="Cancel Order"
                variant="ghost"
                onPress={() => setActiveOrder(null)}
              />
            </View>
          </Card>
        ) : activeOrder?.upi ? (
          <UpiFlow
            order={activeOrder.order}
            upi={activeOrder.upi}
            onDone={() => setActiveOrder(null)}
          />
        ) : (
          <>
            <DailyBonusCard />

            <RedeemCouponCard
              appliedCoupon={appliedCoupon}
              onDiscountApplied={setAppliedCoupon}
              onClearCoupon={() => setAppliedCoupon(null)}
            />

            <Text className="mb-3 text-sm font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Select a coin pack
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

            <View className="mt-4 gap-2.5">
              {canPayCashfree ? (
                <GradientButton
                  title="⚡ Pay Now with Cashfree"
                  isLoading={createCashfreeOrder.isPending}
                  disabled={!activePackageId}
                  onPress={() => createCashfreeOrder.mutate()}
                />
              ) : (
                <Card>
                  <Text className="text-sm" style={{ color: colors.textMuted }}>
                    Online payments are not configured yet. Contact {options?.supportEmail ?? 'support'} for coins.
                  </Text>
                </Card>
              )}
            </View>

            <Text className="mt-5 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
              Coins never expire.
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
