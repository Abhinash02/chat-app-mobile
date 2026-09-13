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
        {/* One box, not two.
            `shadow-sm` compiles to an Android `elevation` — nativewind's shadow
            plugin sets `-rn-elevation` from the shadow value — and elevation
            draws the view's own silhouette as a lit surface. Over a fill at 8%
            alpha that surface showed through as a second, hard-edged rectangle
            behind the panel, which is the box inside a box on the APK. A tinted
            alert has no need of a shadow: the border already lifts it off the
            page, and every other shadow in the app sits on an opaque fill where
            the silhouette has nothing to show through.

            `space-y-2` went with it. It is a `> * + *` selector utility, and a
            React Native style object has no way to express "every child after
            the first", so the gap is stated on the child that needs it. */}
        <View
          className="mb-4 p-4 rounded-3xl border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          {/* Top-aligned, and the heading takes the remaining width: it runs to
              two lines on a phone, and without `flex-1` it pushes past the icon
              instead of wrapping beside it. */}
          <View className="flex-row items-start gap-2">
            <View className="h-8 w-8 rounded-xl items-center justify-center bg-red-500/20">
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
            </View>
            <Text
              className="flex-1 text-sm font-black text-red-600 dark:text-red-400"
              style={{ lineHeight: 19 }}
            >
              STRICT SAFETY NOTICE: NEVER SHARE CONTACTS OR OTPS
            </Text>
          </View>

          <Text className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300 font-medium">
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
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Confidentiality:</Text> Images, voice notes, live camera feeds, and messages cannot be recorded or saved to other users&rsquo; galleries without authorization.
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
            • <Text className="font-bold" style={{ color: colors.textPrimary }}>Automatic word filtering:</Text> Messages, photo captions, and voice-room chat pass through an automated filter that masks abusive and sexual terms in English, Hindi, and Punjabi. It runs on our servers as the message is sent. This is pattern matching against a word list, not a person reading your chats — no human sees a message because of it.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>What gets stored:</Text> The filtered version is what is saved and delivered. Masked words are replaced before the message is written, so the original wording is not kept.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Instant Block &amp; Report:</Text> You can block or report any user at any time from the chat or call menu.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>What a report captures:</Text> Filing a report saves a snapshot of recent messages in that conversation so our team can review what happened. That snapshot is kept even if either person later deletes those messages. This is the one case where a person reads part of a conversation, and only after somebody reports it.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Message Deletion:</Text> You can {'"Delete for Everyone"'} to remove messages from both participants&rsquo; conversation history. This does not remove them from a report already filed.
            {'\n'}• <Text className="font-bold" style={{ color: colors.textPrimary }}>Permanent Account Deletion:</Text> You have the right to request permanent deletion of your account at any time in App Settings. Requests are reviewed by our team, usually within 24 hours, and your account stays open until then — you can cancel the request before it is approved. Once approved, your account is closed and all active sessions are signed out. Reports filed against an account may be retained for safety and legal purposes after deletion.
          </Text>
        </Card>

        {/* Section 7: the conduct rules, mirrored from the Terms of Use so that
            nobody has to read both documents to find out what is not allowed. */}
        <Card className="mb-3.5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="hand-left" size={16} color="#EF4444" />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              7. What Is Not Allowed
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            Vibe Chat is a place to meet people and talk. It is not an adult platform. These rules
            apply in chats, voice rooms, photo posts, captions, status updates, and profiles:
            {'\n'}
            {'\n'}• <Text className="font-bold text-red-500">No abusive or vulgar language</Text> — swearing, insults, and gaali in any language, including Roman script.
            {'\n'}• <Text className="font-bold text-red-500">No sexual talk</Text> — sexual conversation, propositions, or explicit descriptions, even where both people appear willing.
            {'\n'}• <Text className="font-bold text-red-500">No nudity or sexual media</Text> — sending, posting, or requesting nude or sexual photos, videos, or voice notes. Asking is a violation on its own.
            {'\n'}• <Text className="font-bold text-red-500">No sexual solicitation</Text> — offering or asking for paid sexual services or content, for coins or for money.
            {'\n'}• <Text className="font-bold text-red-500">No harassment</Text> — messaging someone who has asked you to stop, or intimidating, stalking, threatening, or impersonating anyone.
            {'\n'}• <Text className="font-bold text-red-500">No hate speech</Text> — attacks based on religion, caste, region, gender, sexuality, disability, or ethnicity.
            {'\n'}• <Text className="font-bold text-red-500">Nothing involving minors</Text> — the service is 18+. Sexual content involving a minor, or any attempt to contact one, is reported to the authorities.
            {'\n'}
            {'\n'}Violations lead to content removal, suspension, or permanent termination depending on severity. The most serious result in immediate permanent termination with no warning, and coins on a terminated account are forfeited. Full detail is in the Terms of Use.
          </Text>
        </Card>

        {/* Section 8: Contact Us */}
        <Card>
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="mail" size={16} color={colors.primary} />
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              8. Contact Privacy & Grievance Team
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
