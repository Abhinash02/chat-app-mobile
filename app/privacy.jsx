import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Card } from '../src/components/ui.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

export default function PrivacyPolicy() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title="Privacy & Safety Policy" fallback="/(tabs)/profile" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.primary }}>
            Last Updated: September 2026
          </Text>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${colors.primary}18` }}
          >
            <Text className="text-[10px] font-black uppercase" style={{ color: colors.primary }}>
              Official Policy
            </Text>
          </View>
        </View>

        {/* CRITICAL SAFETY WARNING BANNER */}
        <View
          className="mb-4 p-4 rounded-3xl border shadow-sm space-y-2"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-xl items-center justify-center bg-red-500/20">
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
            </View>
            <Text className="text-sm font-black text-red-600 dark:text-red-400">
              STRICT SAFETY NOTICE: NEVER SHARE CONTACTS OR OTPS
            </Text>
          </View>

          <Text className="text-xs leading-5 text-red-700 dark:text-red-300 font-medium">
            • <Text className="font-bold">No Contact Information Sharing:</Text> Never share your mobile phone number, WhatsApp number, Instagram/Snapchat handle, personal email, or home address in chats or calls.
            {'\n'}• <Text className="font-bold">Never Share OTPs or Passwords:</Text> Vibe Chat staff will <Text className="font-bold underline">NEVER</Text> ask for your verification OTP, password, UPI PIN, or banking credentials. Anyone asking for OTPs is attempting fraud.
            {'\n'}• <Text className="font-bold">Zero Tolerance for Scams:</Text> Soliciting personal contact details or external payment links violates our Community Guidelines and will result in <Text className="font-bold">immediate, permanent account termination and device banning</Text>.
          </Text>
        </View>

        {/* Section: Overview */}
        <Card className="mb-3.5">
          <Text className="text-sm font-medium leading-5" style={{ color: colors.textPrimary }}>
            Your privacy and security are the core foundations of <Text className="font-bold" style={{ color: colors.primary }}>Vibe Chat</Text>. This policy explains how your information is protected across our 1-on-1 chats, random calls, voice rooms, arcade games, and coin wallet.
          </Text>
        </Card>

        {/* Section 1: Screenshot & Capture Protection */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              1. Screenshot & Screen Recording Protection
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Hardware-Level Protection:</Text> Screen recording and screenshot capture are actively blocked inside private 1-on-1 chats, random video/voice calls, and voice rooms.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Confidentiality:</Text> Images, voice notes, live camera feeds, and messages cannot be recorded or saved to other users' galleries without authorization.
          </Text>
        </Card>

        {/* Section 2: Data We Collect */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="person-circle" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              2. Information We Collect
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Account Details:</Text> Email address and securely salted hashed passwords. Your email is strictly private and never shown to other users.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Public Profile:</Text> Nickname, gender, bio, age bracket, zodiac sign, avatar, and active status.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Messages & Media:</Text> Encrypted text messages, voice clips, emoji reactions, and photos shared between accounts.
          </Text>
        </Card>

        {/* Section 3: Nearby Random Calls & Location */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="videocam" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              3. Nearby Random Calls & Proximity
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Ephemeral Real-Time Media:</Text> Random video and audio calls use encrypted peer-to-peer WebRTC channels. We do <Text className="font-bold">not</Text> record, store, or monitor your private video or audio calls.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Location Privacy:</Text> When enabled, GPS is only used to compute straight-line approximate distances (e.g. {'"3 km away"'}). Your exact street address, GPS coordinates, or real-time location tracks are never exposed.
          </Text>
        </Card>

        {/* Section 4: Voice Rooms & Arcade Games */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="game-controller" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              4. Voice Rooms, Arcade Games & Points
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Live Voice Rooms:</Text> Voice room audio is streamed in real time to connected room participants and is not archived.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Game Points & Conversion:</Text> Arcade game scores and points earned through gameplay are tied to your account for leaderboard rankings and can be converted into spendable coins per platform exchange limits.
          </Text>
        </Card>

        {/* Section 5: Coin Wallet & Payments */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="cash" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              5. Coin Wallet & Payment Security
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Payment Gateway:</Text> Payments are processed through RBI-compliant, PCI-DSS certified gateways (Razorpay / UPI). We never store debit/credit card numbers or CVVs.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>In-App Economy:</Text> Coins purchased or earned via daily bonuses and game conversions are non-transferable outside the app.
          </Text>
        </Card>

        {/* Section 6: Safety, Reporting & User Controls */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              6. Safety, Reporting & Content Moderation
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Instant Block & Report:</Text> You can block or report any abusive user at any time directly from the chat or call menu.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Message Deletion:</Text> You can {'"Delete for Everyone"'} to remove messages from both participants' conversation history.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Permanent Account Deletion:</Text> You have the right to permanently delete your account at any time in App Settings, which instantly wipes your profile, active sessions, and data.
          </Text>
        </Card>

        {/* Section 7: Contact Us */}
        <Card>
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="mail" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              7. Contact Privacy & Grievance Team
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            For privacy queries, data deletion requests, or security grievances, contact our compliance officer at:
            {'\n'}
            <Text className="font-black text-sm" style={{ color: colors.primary }}>
              privacy@vibechat.app
            </Text>
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
