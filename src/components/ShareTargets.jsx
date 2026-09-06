import { Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider.jsx';
import { useToast } from './Toast.jsx';

/**
 * Where an invite can be sent, as named buttons rather than one system sheet.
 *
 * The OS share sheet already lists these, but it costs a tap to discover and
 * shows whatever the phone happens to have installed — a wall of icons that
 * buries the two apps anyone actually uses. Naming WhatsApp and SMS outright
 * makes the common path one tap, and "More" still opens the full sheet for
 * everything else.
 *
 * Availability is deliberately not probed with `canOpenURL`. On Android 11+
 * that needs every scheme declared in the manifest's `<queries>`, and a scheme
 * missing from that list reports "not installed" even when the app is right
 * there. Opening and catching the failure is honest about what actually
 * happened and needs no manifest surgery.
 */

const BRAND = {
  whatsapp: '#25D366',
  telegram: '#229ED9',
  sms: '#34A853',
  email: '#EA4335',
  facebook: '#1877F2',
  twitter: '#111111',
};

export function ShareTargets({ message, url, title = 'Share your invite' }) {
  const { colors } = useTheme();
  const toast = useToast();

  const text = message ?? '';
  const encoded = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url ?? '');

  async function openExternal(target, appName) {
    try {
      await Linking.openURL(target);
    } catch {
      // Almost always "that app is not installed". Falling through to the
      // system sheet means the tap still accomplishes something.
      toast.info(`${appName} is not available — opening your share options.`);
      openSystemSheet();
    }
  }

  async function openSystemSheet() {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch {
          // Dismissed, or the browser refused. Copying is the useful fallback.
        }
      }
      await copyToClipboard();
      return;
    }

    try {
      await Share.share({ message: text, title, url });
    } catch {
      toast.error('Could not open share options');
    }
  }

  async function copyToClipboard() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        await Clipboard.setStringAsync(text);
      }
      toast.success('Invite copied — paste it anywhere');
    } catch {
      toast.info('Invite ready to share');
    }
  }

  const targets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'logo-whatsapp',
      tint: BRAND.whatsapp,
      onPress: () =>
        openExternal(
          // The universal link works whether or not the app is installed; the
          // custom scheme does not, and fails silently in a browser.
          Platform.OS === 'web'
            ? `https://wa.me/?text=${encoded}`
            : `whatsapp://send?text=${encoded}`,
          'WhatsApp',
        ),
    },
    {
      key: 'sms',
      label: 'Message',
      icon: 'chatbubble-ellipses',
      tint: BRAND.sms,
      onPress: () =>
        openExternal(
          // iOS separates the body with `&`, Android with `?`. Getting this
          // wrong opens the composer with an empty message.
          Platform.OS === 'ios' ? `sms:&body=${encoded}` : `sms:?body=${encoded}`,
          'Messages',
        ),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: 'paper-plane',
      tint: BRAND.telegram,
      onPress: () =>
        openExternal(`https://t.me/share/url?url=${encodedUrl}&text=${encoded}`, 'Telegram'),
    },
    {
      key: 'email',
      label: 'Email',
      icon: 'mail',
      tint: BRAND.email,
      onPress: () =>
        openExternal(`mailto:?subject=${encodeURIComponent(title)}&body=${encoded}`, 'Email'),
    },
    {
      key: 'copy',
      label: 'Copy',
      icon: 'copy',
      tint: colors.primary,
      onPress: copyToClipboard,
    },
    {
      key: 'more',
      label: 'More',
      icon: 'ellipsis-horizontal',
      tint: colors.textSecondary,
      onPress: openSystemSheet,
    },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
      {targets.map((target) => (
        <Pressable
          key={target.key}
          onPress={target.onPress}
          accessibilityRole="button"
          accessibilityLabel={`Share via ${target.label}`}
          style={({ pressed }) => ({
            // Three across on a phone, with the gap accounted for.
            width: '30%',
            alignItems: 'center',
            paddingVertical: 12,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${target.tint}18`,
            }}
          >
            <Ionicons name={target.icon} size={21} color={target.tint} />
          </View>
          <Text
            numberOfLines={1}
            style={{ marginTop: 7, fontSize: 11.5, fontWeight: '700', color: colors.textPrimary }}
          >
            {target.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default ShareTargets;
