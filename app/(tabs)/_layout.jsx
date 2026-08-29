import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';

import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

function TabIcon({ emoji, focused, color }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.55, color }}>{emoji}</Text>
  );
}

/** The unread badge on the Chats tab, fed by the socket. */
function UnreadBadge({ count }) {
  const { colors } = useTheme();
  if (!count) return null;

  return (
    <View
      className="absolute -right-2.5 -top-1 min-w-[18px] items-center justify-center rounded-full px-1"
      style={{ backgroundColor: colors.danger, height: 18 }}
    >
      <Text className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useSocket();

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
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="✨" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <View>
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
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🎙️" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🎮" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="👤" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
