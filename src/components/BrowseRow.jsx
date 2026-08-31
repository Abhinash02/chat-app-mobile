import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { CARD_HEIGHT, PersonCard } from './PersonCard.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/** How many fit before the swipe stops being a swipe and becomes a scroll. */
const MAX_IN_ROW = 10;
const CARD_WIDTH = 138;

/**
 * The tile at the end of the row.
 *
 * A row that simply stops leaves the reader unsure whether that is everyone.
 * An explicit end tile answers that and gives them somewhere to go — the same
 * job "See more rooms" does in apps like this.
 */
function SeeMoreCard({ total, href }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel="See everyone"
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: colors.primary,
        borderRadius: radius || 16,
        paddingHorizontal: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        className="mb-3 h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 24, fontWeight: 'bold' }}>›</Text>
      </View>
      <Text className="text-center text-sm font-bold" style={{ color: colors.onPrimary }}>
        See more
      </Text>
      {total > MAX_IN_ROW ? (
        <Text className="mt-1 text-xs" style={{ color: colors.onPrimary, opacity: 0.85 }}>
          {total - MAX_IN_ROW} more
        </Text>
      ) : (
        <Text className="mt-1 text-xs" style={{ color: colors.onPrimary, opacity: 0.85 }}>
          View all
        </Text>
      )}
    </Pressable>
  );
}

/**
 * A swipeable row of people, online first.
 *
 * Capped at ten with an end tile rather than paging endlessly sideways:
 * horizontal lists are for sampling, and someone who wants to work through
 * everyone is better served by the grid the tile opens.
 */
export function BrowseRow({
  people,
  total,
  isLoading,
  presence,
  onOpen,
  openingId,
  seeMoreHref = '/browse',
  actionLabel,
}) {
  if (isLoading) {
    return (
      <FlatList
        data={[0, 1, 2, 3]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View className="mr-3">
            <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} radius={16} />
          </View>
        )}
      />
    );
  }

  if (!people?.length) return null;

  const shown = people.slice(0, MAX_IN_ROW);

  return (
    <FlatList
      data={shown}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
      keyExtractor={(item) => item.id}
      // Snapping makes each swipe land on a card rather than mid-way between
      // two, which is what stops a horizontal row feeling loose.
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      ListFooterComponent={
        <View className="ml-3">
          <SeeMoreCard total={total ?? people.length} href={seeMoreHref} />
        </View>
      }
      renderItem={({ item }) => (
        <PersonCard
          person={item}
          presence={presence}
          width={CARD_WIDTH}
          actionLabel={actionLabel}
          isOpening={openingId === item.id}
          onPress={() => onOpen(item)}
        />
      )}
    />
  );
}

export { CARD_WIDTH, MAX_IN_ROW };
