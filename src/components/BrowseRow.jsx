import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { CARD_HEIGHT, CARD_WIDTH, PersonCard } from './PersonCard.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

const CARD_GAP = 12;

/**
 * Two people per column, swiped sideways.
 *
 * One long row showed four faces on a phone and asked for a lot of swiping to
 * see anyone else. Stacking two and scrolling horizontally puts eight in the
 * same gesture without making the section taller than a thumb can reach past.
 */
const ROWS = 2;

/* A multiple of ROWS, so a page never ends with a half-empty column. */
const PAGE_SIZE = 10;

/** The height the row occupies: two cards plus the gap between them. */
const ROW_HEIGHT = CARD_HEIGHT * ROWS + CARD_GAP * (ROWS - 1);

/** Splits a flat list into the vertical stacks the horizontal scroller holds. */
function toColumns(people) {
  const columns = [];
  for (let index = 0; index < people.length; index += ROWS) {
    columns.push(people.slice(index, index + ROWS));
  }
  return columns;
}

/** Inline "loading more" spinner at the end of the row. */
function LoadingMoreCard() {
  const { colors } = useTheme();
  return (
    <View style={{ width: 92, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 6, fontWeight: '600' }}>
        Loading…
      </Text>
    </View>
  );
}

/** "All caught up" marker closing the row. */
function EndCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 128,
        height: ROW_HEIGHT,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: `${colors.primary}45`,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 26 }}>🎉</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 11.5, fontWeight: '800', textAlign: 'center' }}>
        All caught up
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', lineHeight: 13 }}>
        You&apos;ve seen everyone
      </Text>
    </View>
  );
}

/**
 * A horizontal row of people (Online Now / Browse Everyone).
 *
 * Deliberately a ScrollView rather than a horizontal FlatList. These rows are
 * rendered inside the home screen's vertical ScrollView, and nesting a
 * VirtualizedList inside a ScrollView is what produced the blank rows and hard
 * crashes on Android release builds. The window here is capped at a page at a
 * time, so there is nothing for virtualization to save.
 */
export function BrowseRow({
  people,
  total,
  isLoading,
  presence,
  onOpen,
  openingId,
  onLoadMore,
  isLoadingMore,
  actionLabel,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const safePeople = Array.isArray(people) ? people : [];
  const shown = safePeople.slice(0, visibleCount);
  const allLocalLoaded = visibleCount >= safePeople.length;
  const hasMoreRemote = total != null ? safePeople.length < total : false;

  // Reveals the next page as the row nears its end. Reading the scroll frame
  // directly replaces FlatList's onEndReached, which came with the nesting.
  const handleScroll = useCallback(
    (event) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const remaining = contentSize.width - (contentOffset.x + layoutMeasurement.width);
      if (remaining > 240) return;

      if (isLoadingMore) return;
      if (!allLocalLoaded) setVisibleCount((count) => count + PAGE_SIZE);
      else if (hasMoreRemote && onLoadMore) onLoadMore();
    },
    [allLocalLoaded, hasMoreRemote, isLoadingMore, onLoadMore],
  );

  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, paddingRight: 16, gap: CARD_GAP }}
      >
        {[0, 1, 2, 3].map((column) => (
          <View key={column} style={{ gap: CARD_GAP }}>
            <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} radius={20} />
            <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} radius={20} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (safePeople.length === 0) return null;

  const showLoadingMore = isLoadingMore && allLocalLoaded && hasMoreRemote;
  const showEnd = allLocalLoaded && !hasMoreRemote && shown.length > 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={64}
      /* Aligned to the top so a final column holding one person leaves the gap
         below it rather than floating that card into the middle. */
      contentContainerStyle={{
        paddingVertical: 4,
        paddingRight: 16,
        gap: CARD_GAP,
        alignItems: 'flex-start',
      }}
    >
      {toColumns(shown).map((column, columnIndex) => (
        <View key={column[0]?.id ?? `column-${columnIndex}`} style={{ gap: CARD_GAP }}>
          {column.map((item, rowIndex) => (
            <PersonCard
              key={String(item?.id ?? `person-${columnIndex}-${rowIndex}`)}
              person={item}
              presence={presence}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              actionLabel={actionLabel}
              isOpening={openingId === item?.id}
              onPress={onOpen}
            />
          ))}
        </View>
      ))}

      {showLoadingMore ? <LoadingMoreCard /> : null}
      {showEnd ? <EndCard /> : null}
    </ScrollView>
  );
}

export { CARD_WIDTH, CARD_HEIGHT };
