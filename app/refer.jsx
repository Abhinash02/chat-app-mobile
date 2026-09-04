import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { referralApi } from '../src/api/endpoints.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function genderEmoji(gender) {
  return gender === 'female' ? '👧' : '👦';
}

export default function ReferScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { socket } = useSocket();
  const [copied, setCopied] = useState(false);
  const [showAllRates, setShowAllRates] = useState(false);

  const {
    data: codeData,
    isLoading: codeLoading,
    refetch: refetchCode,
  } = useQuery({
    queryKey: ['referral-my-code'],
    queryFn: () => referralApi.myCode(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => referralApi.stats(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    isRefetching: isRefetchingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['referral-history'],
    queryFn: () => referralApi.history({ limit: 50 }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const refetchersRef = useRef({ refetchCode, refetchStats, refetchHistory });
  useEffect(() => {
    refetchersRef.current = { refetchCode, refetchStats, refetchHistory };
  }, [refetchCode, refetchStats, refetchHistory]);

  // Robust live sync: listens only to server events without polling or focus churn
  useEffect(() => {
    if (!socket) return;
    const handleSettingsUpdate = () => {
      refetchersRef.current.refetchCode();
      refetchersRef.current.refetchStats();
      refetchersRef.current.refetchHistory();
    };
    socket.on('settings:updated', handleSettingsUpdate);
    socket.on('referral:updated', handleSettingsUpdate);
    return () => {
      socket.off('settings:updated', handleSettingsUpdate);
      socket.off('referral:updated', handleSettingsUpdate);
    };
  }, [socket]);

  const onRefresh = useCallback(() => {
    refetchCode();
    refetchStats();
    refetchHistory();
  }, [refetchCode, refetchStats, refetchHistory]);

  // Extract response fields
  const code = codeData?.code ?? codeData?.data?.code ?? '';
  const link = codeData?.link ?? codeData?.data?.link ?? '';
  const myGender = String(codeData?.gender ?? codeData?.data?.gender ?? 'male').toLowerCase();
  const rewards = codeData?.rewards ?? codeData?.data?.rewards ?? {
    boyToBoy: 10,
    boyToGirl: 10,
    girlToBoy: 10,
    girlToGirl: 10,
    enabled: true,
  };

  const isGirl = myGender === 'female';

  const totalReferrals = statsData?.totalReferrals ?? statsData?.data?.totalReferrals ?? 0;
  const totalCoinsEarned = statsData?.totalCoinsEarned ?? statsData?.data?.totalCoinsEarned ?? 0;
  const history = historyData?.items ?? historyData?.data ?? (Array.isArray(historyData) ? historyData : []);

  async function handleCopy() {
    if (!code) {
      toast.info('Referral code still loading...');
      return;
    }
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        await Clipboard.setStringAsync(code);
      }
      setCopied(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.success('Referral code copied!');
    }
  }

  async function handleShare() {
    if (!code) {
      toast.info('Referral code still loading...');
      return;
    }

    const shareUrl =
      link ||
      (typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/register?ref=${code}`
        : `https://app.vibechat.app/register?ref=${code}`);

    const shareText = `🎁 Join me on Vibe Chat!\nUse my referral code: ${code}\nSign up here: ${shareUrl}`;

    // Web Browser Share
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Join me on Vibe Chat!',
            text: shareText,
            url: shareUrl,
          });
          return;
        } catch {
          // Fallback to copy if user dismissed or web share failed
        }
      }
      // Fallback on web: copy to clipboard
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        } else {
          await Clipboard.setStringAsync(shareText);
        }
        toast.success('Referral link copied to clipboard!');
      } catch {
        toast.info('Share link ready!');
      }
      return;
    }

    // Android & iOS Native Share
    try {
      await Share.share({
        message: shareText,
        title: 'Join me on Vibe Chat!',
        url: shareUrl,
      });
    } catch {
      toast.error('Could not open share dialog');
    }
  }

  const isLoading = codeLoading || statsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Admin-Managed Dynamic Gradient */}
      <LinearGradient
        colors={[
          colors.gradientStart || colors.primary || '#7C3AED',
          colors.gradientEnd || colors.secondary || '#EC4899',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top + 10, 24),
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
      >
        {/* Top bar with back and live sync indicator */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Pressable
            onPress={() => goBack()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
            hitSlop={10}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>← Back</Text>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.25)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              gap: 5,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Live Rates</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>🎁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>
              Refer &amp; Earn
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 2, fontWeight: '500' }}>
              {isGirl
                ? 'Invite friends & earn coins convertible to ₹ Real Cash!'
                : 'Invite friends and get instant free coins!'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={history}
        keyExtractor={(item) => item._id || String(Math.random())}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingHistory}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            {/* Referral Code Card */}
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                marginBottom: 14,
                backgroundColor: colors.surface || colors.card,
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border || '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text
                  style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}
                >
                  YOUR UNIQUE REFERRAL CODE
                </Text>
                <View
                  style={{
                    backgroundColor: isGirl ? `${colors.femaleAccent || '#EC4899'}18` : `${colors.maleAccent || '#3B82F6'}18`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isGirl ? `${colors.femaleAccent || '#EC4899'}33` : `${colors.maleAccent || '#3B82F6'}33`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isGirl ? colors.femaleAccent || '#EC4899' : colors.maleAccent || '#3B82F6',
                    }}
                  >
                    {isGirl ? '👧 Girl Account' : '👦 Boy Account'}
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary }}>Fetching your unique code...</Text>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      backgroundColor: colors.surfaceAlt || `${colors.primary}0D`,
                      borderRadius: 16,
                      paddingVertical: 18,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      marginBottom: 14,
                      borderWidth: 2,
                      borderColor: `${colors.primary}33`,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: '900',
                        color: colors.primary,
                        letterSpacing: 5,
                      }}
                      selectable={true}
                    >
                      {code || 'GENERATING...'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted || colors.textSecondary, marginTop: 4, fontWeight: '500' }}>
                      Tap Copy or Share to send your invite link
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={handleCopy}
                      style={{
                        flex: 1,
                        backgroundColor: copied ? (colors.success || '#10B981') : (colors.surface || colors.card),
                        borderRadius: 14,
                        paddingVertical: 13,
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: copied ? (colors.success || '#10B981') : `${colors.primary}40`,
                      }}
                    >
                      <Text
                        style={{
                          color: copied ? '#fff' : colors.primary,
                          fontWeight: '800',
                          fontSize: 14,
                        }}
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Code'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleShare}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        paddingVertical: 13,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={[
                          colors.gradientStart || colors.primary || '#7C3AED',
                          colors.gradientEnd || colors.secondary || '#EC4899',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 14,
                        }}
                      />
                      <Text style={{ color: colors.onPrimary || '#fff', fontWeight: '800', fontSize: 14 }}>
                        🚀 Share Link
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Total Stats Row */}
            <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Friends Joined', value: totalReferrals, emoji: '👥', color: colors.primary },
                { label: 'Coins Earned', value: totalCoinsEarned, emoji: '🪙', color: colors.coinGold || '#F59E0B' },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface || colors.card,
                    borderRadius: 18,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border || '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{stat.emoji}</Text>
                  <Text
                    style={{ fontSize: 26, fontWeight: '900', color: colors.textPrimary || colors.text, marginTop: 4 }}
                  >
                    {statsLoading ? '—' : stat.value}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Dynamic Real-Time Referral Reward Rates Section */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 14,
                backgroundColor: colors.surface || colors.card,
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border || '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              {/* Header with Live Status */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary || colors.text }}>
                    💰 Live Referral Rates
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                    Managed in real-time by Admin
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#10B98118',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>AUTO-SYNC</Text>
                </View>
              </View>

              {/* Your Active Earnings Tier Banner */}
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                  backgroundColor: isGirl ? `${colors.femaleAccent || '#EC4899'}10` : `${colors.maleAccent || '#3B82F6'}10`,
                  borderWidth: 1.5,
                  borderColor: isGirl ? `${colors.femaleAccent || '#EC4899'}30` : `${colors.maleAccent || '#3B82F6'}30`,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: isGirl ? colors.femaleAccent || '#EC4899' : colors.maleAccent || '#3B82F6',
                      letterSpacing: 0.5,
                    }}
                  >
                    ★ YOUR CURRENT REWARD RATES ({isGirl ? 'GIRL' : 'BOY'})
                  </Text>
                  {isGirl && (
                    <View
                      style={{
                        backgroundColor: '#10B98120',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#10B981' }}>₹ WITHDRAWABLE CASH</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Card 1: Referring a Boy */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface || '#fff',
                      borderRadius: 14,
                      padding: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>👦</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4 }}>
                      Invite a Boy
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        backgroundColor: isGirl ? `${colors.femaleAccent || '#EC4899'}15` : `${colors.maleAccent || '#3B82F6'}15`,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '900',
                          color: isGirl ? colors.femaleAccent || '#EC4899' : colors.maleAccent || '#3B82F6',
                        }}
                      >
                        +{isGirl ? rewards.girlToBoy : rewards.boyToBoy} Coins
                      </Text>
                    </View>
                  </View>

                  {/* Card 2: Referring a Girl */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface || '#fff',
                      borderRadius: 14,
                      padding: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>👧</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4 }}>
                      Invite a Girl
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        backgroundColor: isGirl ? `${colors.femaleAccent || '#EC4899'}15` : `${colors.primary || '#7C3AED'}15`,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '900',
                          color: isGirl ? colors.femaleAccent || '#EC4899' : colors.primary || '#7C3AED',
                        }}
                      >
                        +{isGirl ? rewards.girlToGirl : rewards.boyToGirl} Coins
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* All Platform Rates Toggle & Breakdown */}
              <Pressable
                onPress={() => setShowAllRates((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  {showAllRates ? '▲ Hide all 4 reward combinations' : '▼ View all 4 reward combinations'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {showAllRates ? 'Collapse' : 'Expand'}
                </Text>
              </Pressable>

              {showAllRates && (
                <View style={{ gap: 8, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border || '#E5E7EB' }}>
                  {[
                    { label: 'Boy refers Boy', emoji: '👦 ➔ 👦', coins: rewards.boyToBoy, color: colors.maleAccent || '#3B82F6', tag: 'Free Coins' },
                    { label: 'Boy refers Girl', emoji: '👦 ➔ 👧', coins: rewards.boyToGirl, color: colors.primary || '#7C3AED', tag: 'Free Coins' },
                    { label: 'Girl refers Boy', emoji: '👧 ➔ 👦', coins: rewards.girlToBoy, color: colors.femaleAccent || '#EC4899', tag: 'Real Money ₹' },
                    { label: 'Girl refers Girl', emoji: '👧 ➔ 👧', coins: rewards.girlToGirl, color: colors.femaleAccent || '#EC4899', tag: 'Real Money ₹' },
                  ].map((row) => (
                    <View
                      key={row.label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: colors.surfaceAlt || '#F9FAFB',
                        borderRadius: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{row.label}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>{row.tag}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: row.color }}>
                        +{row.coins} Coins
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* How It Works Guide */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 14,
                backgroundColor: `${colors.primary}0D`,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: `${colors.primary}22`,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 10 }}>
                💡 How It Works
              </Text>
              {[
                '1️⃣  Share your unique referral link or code with friends',
                '2️⃣  Friend downloads the app & registers with your code',
                '3️⃣  You instantly receive coins directly in your wallet',
                isGirl
                  ? '4️⃣  As a Girl account, your referral coins can be withdrawn to UPI / Bank Account!'
                  : '4️⃣  Use your coins for calls, random matches, and game perks!',
              ].map((step) => (
                <Text key={step} style={{ color: colors.textSecondary, fontSize: 12.5, marginBottom: 6, lineHeight: 18 }}>
                  {step}
                </Text>
              ))}
            </View>

            {history.length > 0 && (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 1,
                  marginHorizontal: 20,
                  marginBottom: 8,
                }}
              >
                REFERRAL HISTORY
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={() =>
          !historyLoading && (
            <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 44, marginBottom: 10 }}>🤝</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary || colors.text, textAlign: 'center' }}>
                No referrals yet
              </Text>
              <Text
                style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 }}
              >
                Share your unique code with friends to start earning coins immediately!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 10,
              backgroundColor: colors.surface || colors.card,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border || '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: item.refereeGender === 'female' ? `${colors.femaleAccent || '#EC4899'}15` : `${colors.maleAccent || '#3B82F6'}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 22 }}>
                {genderEmoji(item.refereeGender)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: colors.textPrimary || colors.text, fontSize: 14 }}>
                {item.refereeId?.name ?? 'New User'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                Joined {formatDate(item.createdAt)} • {item.refereeGender === 'female' ? 'Girl' : 'Boy'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: `${colors.success || '#10B981'}15`,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: colors.success || '#10B981', fontWeight: '900', fontSize: 13 }}>
                +{item.rewardCoins} Coins
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
      />
    </View>
  );
}

