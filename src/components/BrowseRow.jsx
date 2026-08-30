import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { PersonCard } from './PersonCard.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/** How many fit before the swipe stops being a swipe and becomes a scroll. */
const MAX_IN_ROW = 10;
const CARD_WIDTH = 132;

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
      className="items-center justify-center px-4"
      style={{
        width: CARD_WIDTH,
        backgroundColor: colors.primary,
        borderRadius: radius,
      }}
    >
      <View
        className="mb-2 h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 22 }}>›</Text>
      </View>
      <Text className="text-center text-sm font-bold" style={{ color: colors.onPrimary }}>
        See more
      </Text>
      {total > MAX_IN_ROW ? (
        <Text className="mt-0.5 text-[11px]" style={{ color: colors.onPrimary, opacity: 0.8 }}>
          {total - MAX_IN_ROW} more
        </Text>
      ) : null}
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
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View className="mr-3">
            <Skeleton width={CARD_WIDTH} height={196} radius={18} />
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
