import { useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { EmptyState } from '../src/components/ui.jsx';
import { PersonCard } from '../src/components/PersonCard.jsx';
import { PersonCardSkeleton } from '../src/components/Loader.jsx';
import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { chatApi, usersApi } from '../src/api/endpoints.js';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

const GRID_GAP = 12;
const GRID_PADDING = 16;

/**
 * Everyone, as a scrollable grid.
 *
 * The home row is for sampling — a few faces, swiped through. This is where
 * someone who actually wants to work through the list ends up, which is why it
 * pages rather than capping at ten.
 */
export default function Browse() {
  // Which row sent us here. The online row and the browse row open the same
  // screen with a different filter, rather than two near-identical screens.
  const { online } = useLocalSearchParams();
  const onlineOnly = online === 'true';

  const { colors } = useTheme();
  const { presence } = useSocket();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [openingId, setOpeningId] = useState(null);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['discover', onlineOnly ? 'online-all' : 'all'],
    queryFn: () => usersApi.discover({ limit: 50, ...(onlineOnly ? { onlineOnly: true } : {}) }),
  });

  async function openChat(person) {
    if (!person?.id) return;
    setOpeningId(person.id);

    try {
      const result = await chatApi.open(person.id);

      if (result.greetingSkippedReason === 'INSUFFICIENT_COINS') {
        toast.info('You are out of coins — top up to say hi.');
        router.push('/coins');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${result.conversation.id}`);
    } catch (openError) {
      toast.error(openError.message ?? 'Could not open that chat');
    } finally {
      setOpeningId(null);
    }
  }

  const people = Array.isArray(data?.items) ? data.items : [];
  const skeletons = Array.from({ length: 6 }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={onlineOnly ? 'Online now' : 'Everyone'}
        subtitle={
          people.length > 0
            ? `${data?.meta?.total ?? people.length} ${onlineOnly ? 'online right now' : 'people to meet'}`
            : undefined
        }
      />

      {error ? (
        <EmptyState emoji="📡" title="Could not load anyone" description={error.message} />
      ) : (
        <FlatList
          data={isLoading ? skeletons : people}
          keyExtractor={(item, index) => String(item?.id ?? `row-${index}`)}
          /* Virtualisation tuning. React Native's defaults keep roughly ten
             screens of rows mounted, which is fine on a flagship and is what
             makes long lists stutter on the mid-range Android phones most of
             these users are on. Smaller batches and a tighter window cost a
             little more work while flinging fast and a lot less memory. */
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={9}
          numColumns={2}
          columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PADDING }}
          contentContainerStyle={{
            paddingVertical: GRID_PADDING,
            gap: GRID_GAP,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) =>
            isLoading ? (
              <View style={{ flex: 1 }}>
                <PersonCardSkeleton />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <PersonCard
                  person={item}
                  presence={presence}
                  width="100%"
                  isOpening={openingId === item?.id}
                  onPress={openChat}
                />
              </View>
            )
          }
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyState
                emoji={onlineOnly ? '🌙' : '🔍'}
                title={onlineOnly ? 'Nobody is online right now' : 'Nobody here yet'}
                description={
                  onlineOnly
                    ? 'Try again in a little while, or browse everyone instead.'
                    : 'Check back in a little while.'
                }
              />
            )
          }
        />
      )}
    </View>
  );
}
