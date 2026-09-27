import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenHeader } from './ScreenHeader.jsx';
import { legalApi } from '../api/endpoints.js';
import { storage } from '../lib/storage.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * One screen for all three policies.
 *
 * The wording used to be JSX in three separate files, which meant a correction
 * to the refund window needed an app release and left the website saying
 * something different in the meantime. It now comes from the same documents the
 * admin panel publishes and the website reads, so there is one source of truth
 * and one place to change it.
 *
 * Rendered as text, never HTML: the body is typed into an admin form, and a
 * policy screen is the last place to hand that to a renderer that can execute.
 */
function parseBlocks(body) {
  return String(body ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block.startsWith('## ')
        ? { kind: 'heading', text: block.slice(3) }
        : { kind: 'paragraph', text: block },
    );
}

export function LegalDocScreen({ slug, title, fallback = '/(tabs)/profile', notice }) {
  const { colors, fonts } = useTheme();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['legal', slug],
    queryFn: async () => {
      const doc = await legalApi.doc(slug);
      // Written on every successful fetch, so the next open works offline.
      storage.setCachedLegalDoc(slug, doc).catch(() => undefined);
      return doc;
    },
    staleTime: 60 * 60_000,
    // A policy that arrived a moment ago is still the policy; keep the cached
    // copy on screen rather than flashing a spinner over it.
    placeholderData: (previous) => previous,
    retry: 1,
  });

  /*
   * Seeds the query from disk on first mount.
   *
   * `initialData` cannot be used because reading storage is asynchronous, so
   * the cached copy is pushed in once it resolves — and only when nothing has
   * arrived from the network yet, so it can never overwrite fresher text.
   */
  const cached = useCachedLegalDoc(slug);

  const doc = data ?? cached;
  const blocks = parseBlocks(doc?.body);

  const effective = doc?.effectiveFrom
    ? new Date(doc.effectiveFrom).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title={doc?.title || title} fallback={fallback} />

      {isLoading && !doc ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !doc ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 34, lineHeight: 42 }}>📄</Text>
          <Text
            style={{
              marginTop: 10,
              fontSize: 16,
              lineHeight: 22,
              fontWeight: '800',
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            Could not load this policy
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 13.5,
              lineHeight: 20,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Check your connection and try again.
          </Text>

          <Pressable
            onPress={() => refetch()}
            accessibilityRole="button"
            className="active:opacity-90"
            style={{
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.primary || '#7C4DFF',
            }}
          >
            <Text
              style={{
                color: colors.onPrimary || '#FFFFFF',
                fontSize: 14.5,
                lineHeight: 20,
                fontWeight: '700',
              }}
            >
              {isFetching ? 'Loading…' : 'Try again'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {effective ? (
            <Text
              style={{
                marginBottom: 14,
                fontSize: 11,
                lineHeight: 15,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontWeight: '800',
                color: colors.primary || '#7C4DFF',
              }}
            >
              In effect from {effective}
            </Text>
          ) : null}

          {/* Safety warnings stay in the app, not in the document.
              They have to be on screen even when the policy body cannot be
              fetched, and they are advice to the reader rather than a clause an
              administrator should be able to soften or delete. */}
          {notice ? notice : null}

          {/* Offline copy, stated plainly rather than silently. */}
          {isError && cached ? (
            <View
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                backgroundColor: `${colors.warning || '#F5A524'}14`,
                borderWidth: 1,
                borderColor: `${colors.warning || '#F5A524'}40`,
              }}
            >
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.textSecondary }}>
                Showing the last version saved on this device — we could not reach the server.
              </Text>
            </View>
          ) : null}

          {blocks.map((block, index) =>
            block.kind === 'heading' ? (
              <Text
                key={index}
                style={{
                  marginTop: index === 0 ? 0 : 22,
                  marginBottom: 6,
                  fontSize: 17,
                  lineHeight: 23,
                  color: colors.textPrimary,
                  fontFamily: fonts?.display,
                }}
              >
                {block.text}
              </Text>
            ) : (
              <Text
                key={index}
                style={{
                  marginBottom: 12,
                  fontSize: 13.5,
                  lineHeight: 21,
                  color: colors.textSecondary,
                }}
              >
                {block.text}
              </Text>
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
}

/** Reads this policy's cached copy once, on mount. */
function useCachedLegalDoc(slug) {
  const [value, setValue] = useState(null);

  useEffect(() => {
    let cancelled = false;
    storage
      .getCachedLegalDoc(slug)
      .then((doc) => {
        if (!cancelled && doc) setValue(doc);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return value;
}

export default LegalDocScreen;
