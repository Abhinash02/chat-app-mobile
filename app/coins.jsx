import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, Field, GradientButton, Input, Loading } from '../src/components/ui.jsx';
import { coinsApi, paymentsApi, withdrawalsApi } from '../src/api/endpoints.js';
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

function WithdrawalModal({ isOpen, onClose, wallet }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const earnings = wallet?.earnings || {};
  const coinsPerRupee = earnings.coinsPerRupee || 25;
  const minCoins = earnings.minWithdrawalCoins || 25;
  const userBalance = wallet?.coinBalance || 0;

  const [coinAmount, setCoinAmount] = useState(String(Math.max(minCoins, Math.min(100, userBalance))));
  const [method, setMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [phone, setPhone] = useState('');

  const numCoins = parseInt(coinAmount, 10) || 0;
  const inrValue = (numCoins / coinsPerRupee).toFixed(2);

  const withdraw = useMutation({
    mutationFn: (payload) => withdrawalsApi.requestWithdrawal(payload),
    onSuccess: (res) => {
      toast.coins(res.message || 'Withdrawal request submitted! 🎉');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-withdrawals'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Could not submit withdrawal request');
    },
  });

  function handleSubmit() {
    if (numCoins < minCoins) {
      toast.error(`Minimum withdrawal is ${minCoins} coins (₹${(minCoins / coinsPerRupee).toFixed(2)})`);
      return;
    }
    if (numCoins > userBalance) {
      toast.error(`Insufficient balance. You have ${userBalance} coins.`);
      return;
    }

    if (method === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        toast.error('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
        return;
      }
      withdraw.mutate({
        coins: numCoins,
        payoutMethod: 'upi',
        upiId: upiId.trim(),
      });
    } else {
      if (!accountHolderName.trim()) {
        toast.error('Please enter Account Holder Name');
        return;
      }
      if (!accountNumber.trim() || accountNumber.length < 6) {
        toast.error('Please enter a valid Bank Account Number');
        return;
      }
      if (!ifsc.trim() || ifsc.length !== 11) {
        toast.error('Please enter a valid 11-digit IFSC Code');
        return;
      }
      withdraw.mutate({
        coins: numCoins,
        payoutMethod: 'bank_transfer',
        bankDetails: {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          phone: phone.trim() || undefined,
        },
      });
    }
  }

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View
          className="p-5 rounded-t-3xl max-h-[85%]"
          style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderBottomColor: colors.border }}>
            <View>
              <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                Convert Coins to Rupees 💸
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {coinsPerRupee} Coins = ₹1.00 INR • Fast Cashfree Payout
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <Text className="text-xl font-bold" style={{ color: colors.textSecondary }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="py-3">
            {/* Conversion calculator card */}
            <View
              className="p-4 rounded-2xl mb-4"
              style={{
                backgroundColor: `${colors.primary}10`,
                borderWidth: 1,
                borderColor: `${colors.primary}30`,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  Your Coin Balance:
                </Text>
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                  🪙 {userBalance} Coins (≈ ₹{((userBalance) / coinsPerRupee).toFixed(2)})
                </Text>
              </View>

              <Field label="Coins to Convert">
                <Input
                  value={coinAmount}
                  onChangeText={setCoinAmount}
                  keyboardType="number-pad"
                  placeholder={`Min ${minCoins} coins`}
                />
              </Field>

              {/* Quick preset chips */}
              <View className="flex-row items-center gap-2 mt-2">
                {[minCoins, 50, 100, 250].filter(c => c <= userBalance || c === minCoins).map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => setCoinAmount(String(val))}
                    className="px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: numCoins === val ? colors.primary : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: numCoins === val ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: numCoins === val ? '#FFFFFF' : colors.textPrimary }}
                    >
                      {val}
                    </Text>
                  </Pressable>
                ))}
                {userBalance >= minCoins && (
                  <Pressable
                    onPress={() => setCoinAmount(String(userBalance))}
                    className="px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: numCoins === userBalance ? colors.primary : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: numCoins === userBalance ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: numCoins === userBalance ? '#FFFFFF' : colors.textPrimary }}
                    >
                      Max ({userBalance})
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Calculated Rupee Output */}
              <View
                className="mt-3 p-3 rounded-xl flex-row items-center justify-between"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  You Will Receive:
                </Text>
                <Text className="text-lg font-black text-emerald-600">
                  ₹{inrValue}
                </Text>
              </View>
            </View>

            {/* Payout method tab */}
            <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
              Select Payout Method
            </Text>
            <View className="flex-row gap-2 mb-3">
              <Pressable
                onPress={() => setMethod('upi')}
                className="flex-1 p-3 rounded-xl items-center"
                style={{
                  backgroundColor: method === 'upi' ? `${colors.primary}18` : colors.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: method === 'upi' ? colors.primary : colors.border,
                }}
              >
                <Text className="text-sm font-bold" style={{ color: method === 'upi' ? colors.primary : colors.textPrimary }}>
                  ⚡ UPI ID (VPA)
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textMuted }}>GPay, PhonePe, Paytm</Text>
              </Pressable>

              <Pressable
                onPress={() => setMethod('bank_transfer')}
                className="flex-1 p-3 rounded-xl items-center"
                style={{
                  backgroundColor: method === 'bank_transfer' ? `${colors.primary}18` : colors.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: method === 'bank_transfer' ? colors.primary : colors.border,
                }}
              >
                <Text className="text-sm font-bold" style={{ color: method === 'bank_transfer' ? colors.primary : colors.textPrimary }}>
                  🏦 Bank Account
                </Text>
                <Text className="text-[10px]" style={{ color: colors.textMuted }}>Direct IMPS/NEFT</Text>
              </Pressable>
            </View>

            {method === 'upi' ? (
              <Field label="Your UPI ID" hint="e.g. yourname@okhdfcbank or 9876543210@paytm">
                <Input
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="Enter UPI VPA"
                  autoCapitalize="none"
                />
              </Field>
            ) : (
              <View className="space-y-2.5">
                <Field label="Account Holder Name">
                  <Input
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    placeholder="Full name as in bank passbook"
                  />
                </Field>
                <Field label="Bank Account Number">
                  <Input
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                    placeholder="e.g. 0123456789012"
                  />
                </Field>
                <Field label="IFSC Code">
                  <Input
                    value={ifsc}
                    onChangeText={(t) => setIfsc(t.toUpperCase())}
                    autoCapitalize="characters"
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                  />
                </Field>
              </View>
            )}

            <View className="mt-4 mb-6">
              <GradientButton
                title={`Transfer ₹${inrValue} to Account`}
                isLoading={withdraw.isPending}
                onPress={handleSubmit}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function GirlsEarningsCard({ wallet }) {
  const { colors } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const earnings = wallet?.earnings || {};
  const coinsPerRupee = earnings.coinsPerRupee || 25;
  const messagesPerReward = earnings.messagesPerReward || 25;
  const rewardCoins = earnings.rewardCoins || 1;
  const currentProgress = earnings.currentProgress || 0;
  const progressInCycle = currentProgress % messagesPerReward;
  const progressPercent = Math.min(100, Math.round((progressInCycle / messagesPerReward) * 100));

  const { data: withdrawalsData } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => withdrawalsApi.getMyWithdrawals({ limit: 5 }),
    refetchInterval: 30_000,
  });

  const recentList = withdrawalsData?.items || [];

  return (
    <View className="mb-5">
      <Card
        style={{
          borderColor: colors.primary,
          borderWidth: 1.5,
          backgroundColor: `${colors.primary}08`,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">💖</Text>
            <View>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                Girls Chat Earnings & Cashout
              </Text>
              <Text className="text-xs" style={{ color: colors.primary }}>
                {messagesPerReward} messages with boys = +{rewardCoins} coin (₹1 = {coinsPerRupee} coins)
              </Text>
            </View>
          </View>
          <Badge label="Girls Club" tone="brand" />
        </View>

        {/* Live Message Progress to Next Coin */}
        <View
          className="p-3.5 rounded-2xl mb-3"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
              💬 Chat Progress ({messagesPerReward} messages = +{rewardCoins} Coin)
            </Text>
            <Text className="text-xs font-bold" style={{ color: colors.primary }}>
              {progressInCycle} / {messagesPerReward} msgs
            </Text>
          </View>

          {/* Progress bar */}
          <View className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.surfaceAlt }}>
            <View
              className="h-full rounded-full"
              style={{ width: `${Math.max(5, progressPercent)}%`, backgroundColor: colors.primary }}
            />
          </View>

          <Text className="text-[11px] mt-1.5" style={{ color: colors.textMuted }}>
            {messagesPerReward - progressInCycle === 0
              ? '🎉 Coin reward ready!'
              : `${messagesPerReward - progressInCycle} more messages with boys to earn +${rewardCoins} coin`}
          </Text>
        </View>

        {/* Balance & Cashout CTA */}
        <View
          className="p-4 rounded-2xl mb-3 flex-row items-center justify-between"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <View>
            <Text className="text-xs" style={{ color: colors.textMuted }}>Your Convertable Cash</Text>
            <View className="flex-row items-baseline gap-1.5 mt-0.5">
              <Text className="text-2xl font-black text-emerald-600">
                ₹{((wallet?.coinBalance || 0) / coinsPerRupee).toFixed(2)}
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
                ({wallet?.coinBalance || 0} Coins)
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 shadow-sm"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-bold text-white">Withdraw 💸</Text>
          </Pressable>
        </View>

        {/* Withdrawal History list */}
        {recentList.length > 0 && (
          <View className="pt-2 border-t" style={{ borderTopColor: colors.border }}>
            <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
              Recent Payout Requests
            </Text>
            {recentList.map((item) => {
              const isPending = item.status === 'pending';
              const isSuccess = item.status === 'success';
              const isRejected = item.status === 'rejected';

              return (
                <View
                  key={item._id}
                  className="flex-row items-center justify-between py-2 border-b border-dashed"
                  style={{ borderBottomColor: `${colors.border}60` }}
                >
                  <View>
                    <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                      ₹{item.amountInRupees?.toFixed(2)} ({item.coins} Coins)
                    </Text>
                    <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                      {item.payoutMethod === 'upi' ? `UPI: ${item.upiId}` : `A/C: ${item.bankDetails?.accountNumber}`}
                    </Text>
                  </View>

                  <View className="items-end">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isPending
                          ? '#FEF3C7'
                          : isSuccess
                            ? '#D1FAE5'
                            : '#FEE2E2',
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold"
                        style={{
                          color: isPending
                            ? '#B45309'
                            : isSuccess
                              ? '#047857'
                              : '#B91C1C',
                        }}
                      >
                        {isPending ? '⏳ Under Review' : isSuccess ? '✅ Transferred' : '❌ Rejected & Refunded'}
                      </Text>
                    </View>
                    {isRejected && item.rejectionReason && (
                      <Text className="text-[9px] text-red-600 mt-0.5" numberOfLines={1}>
                        {item.rejectionReason}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <WithdrawalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        wallet={wallet}
      />
    </View>
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

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return undefined;

    const onCoinsEarned = (data) => {
      toast.coins(data.reason || `+${data.amount} coins earned! 🎉`);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    };

    const onWithdrawalApproved = (data) => {
      toast.success(`Withdrawal of ₹${data.amountInRupees} approved & transferred! 🎉`);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-withdrawals'] });
    };

    const onWithdrawalRejected = (data) => {
      toast.error(`Withdrawal update: ${data.reason}. ${data.coinsRefunded} coins refunded.`);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-withdrawals'] });
    };

    socket.on('coins:earned', onCoinsEarned);
    socket.on('withdrawal:approved', onWithdrawalApproved);
    socket.on('withdrawal:rejected', onWithdrawalRejected);

    return () => {
      socket.off('coins:earned', onCoinsEarned);
      socket.off('withdrawal:approved', onWithdrawalApproved);
      socket.off('withdrawal:rejected', onWithdrawalRejected);
    };
  }, [socket, queryClient]);

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

        {/* Girls Chat Earnings & Cash Conversion Card */}
        {Boolean(wallet?.isUnlimited || user?.gender === 'female' || wallet?.earnings?.enabled) && (
          <GirlsEarningsCard wallet={wallet} />
        )}

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
