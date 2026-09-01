import { Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

function TabIcon({ name, activeName, focused, color }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: focused ? `${colors.primary}18` : 'transparent',
      }}
    >
      <Ionicons
        name={focused ? activeName : name}
        size={20}
        color={focused ? colors.primary : colors.textMuted}
      />
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
        top: -3,
        right: -6,
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
      <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800', lineHeight: 11 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useSocket();
  const insets = useSafeAreaInsets();

  const safeBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : Math.max(insets.bottom, 20);
  const tabHeight = 58 + safeBottom;

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
          paddingTop: 6,
          paddingBottom: safeBottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="sparkles-outline" activeName="sparkles" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ position: 'relative' }}>
              <TabIcon
                name="chatbubble-ellipses-outline"
                activeName="chatbubble-ellipses"
                focused={focused}
                color={color}
              />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Voice',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="radio-outline" activeName="radio" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="game-controller-outline"
              activeName="game-controller"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person-outline" activeName="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
