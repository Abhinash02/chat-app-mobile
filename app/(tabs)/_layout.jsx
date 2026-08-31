import { Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

function TabIcon({ emoji, focused }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 28,
        borderRadius: 14,
        backgroundColor: focused ? `${colors.primary}20` : 'transparent',
      }}
    >
      <Text style={{ fontSize: focused ? 18 : 16, opacity: focused ? 1 : 0.65 }}>
        {emoji}
      </Text>
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
        top: -4,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger,
        borderWidth: 2,
        borderColor: colors.surface,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', lineHeight: 12 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useSocket();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10);
  const tabHeight = 60 + (Platform.OS === 'web' ? 10 : bottomInset);

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
          paddingBottom: Platform.OS === 'web' ? 10 : bottomInset,
          // Subtle top shadow
          shadowColor: '#1A0826',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="✨" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ position: 'relative' }}>
              <TabIcon emoji="💬" focused={focused} color={color} />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🎙️" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🎮" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="👤" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
