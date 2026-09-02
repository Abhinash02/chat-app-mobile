import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { PersonCard } from './PersonCard.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

const CARD_WIDTH = 155;
const CARD_GAP = 10;
const PAGE_SIZE = 10; // how many to show at first, then load more

/**
 * Inline "loading more" spinner at the end of the row
 */
function LoadingMoreCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 80,
        alignSelf: 'stretch',
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: CARD_GAP,
      }}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 6, textAlign: 'center' }}>
        Loading…
      </Text>
    </View>
  );
}

/**
 * "All caught up" card — premium end-of-list indicator
 */
function EndCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 120,
        alignSelf: 'stretch',
        minHeight: 200,
        marginLeft: CARD_GAP,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 5,
      }}
    >
      {/* Background gradient layers */}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: colors.surface,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: `${colors.primary}30`,
        }}
      />
      {/* Top glow blob */}
      <View
        style={{
          position: 'absolute',
          top: -20,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: `${colors.primary}22`,
        }}
      />
      {/* Bottom glow blob */}
      <View
        style={{
          position: 'absolute',
          bottom: -15,
          right: -15,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: `${colors.primary}18`,
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 12,
          paddingVertical: 16,
          gap: 6,
        }}
      >
        {/* Sparkle icon cluster */}
        <View style={{ alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ fontSize: 8, marginBottom: -4, marginLeft: 18, opacity: 0.7 }}>✨</Text>
          <Text style={{ fontSize: 26 }}>🎉</Text>
          <Text style={{ fontSize: 8, marginTop: -4, marginRight: 18, opacity: 0.7 }}>✨</Text>
        </View>

        {/* Primary label */}
        <View
          style={{
            backgroundColor: `${colors.primary}18`,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: `${colors.primary}30`,
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 10,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            All caught up!
          </Text>
        </View>

        {/* Divider dot row */}
        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          {[0.3, 0.6, 1, 0.6, 0.3].map((op, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: 2,
                backgroundColor: colors.primary,
                opacity: op,
              }}
            />
          ))}
        </View>

        {/* Subtitle */}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 9,
            textAlign: 'center',
            lineHeight: 13,
            fontWeight: '500',
          }}
        >
          You've seen{'\n'}everyone! 👀
        </Text>
      </View>
    </View>
  );
}

/**
 * A swipeable row of people with inline infinite scroll.
 *
 * - Shows PAGE_SIZE cards initially.
 * - When user reaches the end, more are appended inline — no new page opens.
 * - Fully live: new users added via real-time presence updates appear automatically.
 */
export function BrowseRow({
  people,
  total,
  isLoading,
  presence,
  onOpen,
  openingId,
  onLoadMore,         // optional: () => Promise<void> — fetches next page from parent
  isLoadingMore,      // optional: boolean
  actionLabel,
}) {
  const { colors } = useTheme();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const shown = people?.slice(0, visibleCount) ?? [];
  const allLocalLoaded = visibleCount >= (people?.length ?? 0);
  const hasMoreRemote = total != null ? (people?.length ?? 0) < total : false;

  const handleEndReached = useCallback(() => {
    if (isLoadingMore) return;

    if (!allLocalLoaded) {
      // Show more from already-fetched array
      setVisibleCount((c) => c + PAGE_SIZE);
    } else if (hasMoreRemote && onLoadMore) {
      // Fetch next page from server — parent appends to `people`
      onLoadMore();
    }
  }, [allLocalLoaded, hasMoreRemote, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <FlatList
        data={[0, 1, 2, 3]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View style={{ marginRight: CARD_GAP }}>
            <Skeleton width={CARD_WIDTH} height={210} radius={20} />
          </View>
        )}
      />
    );
  }

  if (!people?.length) return null;

  const showLoadingMore = isLoadingMore && allLocalLoaded && hasMoreRemote;
  const showEnd = allLocalLoaded && !hasMoreRemote && shown.length > 0;

  return (
    <FlatList
      data={shown}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
      keyExtractor={(item) => item.id}
      snapToInterval={CARD_WIDTH + CARD_GAP}
      decelerationRate="fast"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
      ListFooterComponent={
        showLoadingMore ? (
          <LoadingMoreCard />
        ) : showEnd ? (
          <EndCard />
        ) : null
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

export { CARD_WIDTH };
