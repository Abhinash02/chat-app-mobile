import { Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useLanguage } from '../../src/i18n/LanguageProvider.jsx';

const TAB_KEYS = [
  { name: 'index', key: 'tabs.discover', defaultTitle: 'Discover', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { name: 'chats', key: 'tabs.chats', defaultTitle: 'Chats', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { name: 'rooms', key: 'tabs.rooms', defaultTitle: 'Voice', icon: 'radio-outline', activeIcon: 'radio' },
  { name: 'games', key: 'tabs.games', defaultTitle: 'Games', icon: 'game-controller-outline', activeIcon: 'game-controller' },
  { name: 'profile', key: 'tabs.profile', defaultTitle: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

function TabIcon({ name, activeName, focused }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 42,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? `${colors.primary}18` : 'transparent',
      }}
    >
      <Ionicons name={focused ? activeName : name} size={20} color={focused ? colors.primary : colors.textMuted} />
    </View>
  );
}

/** The unread badge on the Chats tab, fed by the socket. */
function UnreadBadge({ count }) {
  const { colors } = useTheme();
  if (!count) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: 2,
        minWidth: 17,
        height: 17,
        borderRadius: 8.5,
        paddingHorizontal: 3.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger,
        borderWidth: 1.5,
        borderColor: colors.surface,
      }}
    >
      <Text
        allowFontScaling={false}
        style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800', lineHeight: 11 }}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

/** Label under each icon. Explicit lineHeight (rather than relying on the
 * platform default) is what fixes the clipped/cramped rendering — Android in
 * particular will clip descenders when lineHeight isn't set generously above
 * fontSize. allowFontScaling is disabled so a user's system font-size
 * setting can't overflow the fixed tab bar height. */
function TabLabel({ title, focused }) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      style={{
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: focused ? '700' : '600',
        letterSpacing: 0.15,
        marginTop: 3,
        color: focused ? colors.primary : colors.textMuted,
      }}
    >
      {title}
    </Text>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useSocket();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const safeBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : Math.max(insets.bottom, 20);
  const tabHeight = 62 + safeBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: safeBottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      {TAB_KEYS.map((tab) => {
        const title = t(tab.key) || tab.defaultTitle;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title,
              tabBarLabel: ({ focused }) => <TabLabel title={title} focused={focused} />,
              tabBarIcon: ({ focused }) => (
                <View style={{ position: 'relative' }}>
                  <TabIcon name={tab.icon} activeName={tab.activeIcon} focused={focused} />
                  {tab.name === 'chats' ? <UnreadBadge count={unreadCount} /> : null}
                </View>
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}