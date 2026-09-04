import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Text, View } from 'react-native';

import { CARD_HEIGHT, CARD_WIDTH, PersonCard } from './PersonCard.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

const CARD_GAP = 12;
const PAGE_SIZE = 10;

/**
 * Inline "loading more" spinner at the end of the row
 */
function LoadingMoreCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 80,
        height: CARD_HEIGHT,
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
 * "All caught up" card indicator at end of list
 */
function EndCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 120,
        height: CARD_HEIGHT,
        marginLeft: CARD_GAP,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: `${colors.primary}30`,
        backgroundColor: colors.surface,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 24 }}>🎉</Text>
      <View
        style={{
          backgroundColor: `${colors.primary}18`,
          borderRadius: 8,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            color: colors.primary,
            fontSize: 9.5,
            fontWeight: '900',
            textAlign: 'center',
          }}
        >
          All caught up!
        </Text>
      </View>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 8.5,
          textAlign: 'center',
          lineHeight: 12,
        }}
      >
        You've seen everyone ✨
      </Text>
    </View>
  );
}

/**
 * A swipeable horizontal row of people (Online Now / Browse Everyone).
 * Built with full Android APK nested scroll resilience.
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
  const { colors } = useTheme();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const safePeople = Array.isArray(people) ? people : [];
  const shown = safePeople.slice(0, visibleCount);
  const allLocalLoaded = visibleCount >= safePeople.length;
  const hasMoreRemote = total != null ? safePeople.length < total : false;

  const handleEndReached = useCallback(() => {
    if (isLoadingMore) return;

    if (!allLocalLoaded) {
      setVisibleCount((c) => c + PAGE_SIZE);
    } else if (hasMoreRemote && onLoadMore) {
      onLoadMore();
    }
  }, [allLocalLoaded, hasMoreRemote, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <FlatList
        data={[0, 1, 2, 3]}
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingVertical: 4, paddingRight: 16 }}
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View style={{ marginRight: CARD_GAP }}>
            <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} radius={22} />
          </View>
        )}
      />
    );
  }

  if (safePeople.length === 0) return null;

  const showLoadingMore = isLoadingMore && allLocalLoaded && hasMoreRemote;
  const showEnd = allLocalLoaded && !hasMoreRemote && shown.length > 0;

  return (
    <FlatList
      data={shown}
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled={true}
      removeClippedSubviews={false}
      contentContainerStyle={{ paddingVertical: 4, paddingRight: 16 }}
      keyExtractor={(item) => String(item?.id || Math.random())}
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
          height={CARD_HEIGHT}
          actionLabel={actionLabel}
          isOpening={openingId === item?.id}
          onPress={() => onOpen?.(item)}
        />
      )}
    />
  );
}

export { CARD_WIDTH, CARD_HEIGHT };
