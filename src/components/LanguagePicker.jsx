import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LANGUAGES, MAX_LANGUAGES } from '../constants/languages.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/** How many stay visible before "See more" — Hindi, English and Punjabi. */
const COLLAPSED_COUNT = 3;

/**
 * Picks the languages someone is willing to talk in.
 *
 * Collapsed by default. Sixteen chips is a wall that pushes the rest of a
 * signup form off the screen, and the three shown cover most of the audience,
 * so the long tail is one tap away rather than always underfoot.
 */
export function LanguagePicker({ value = [], onChange, hint }) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const selected = Array.isArray(value) ? value : [];

  /*
   * Collapsed still shows anything already chosen.
   *
   * Hiding a selected language behind "See more" would leave someone looking
   * at a count they cannot account for, with no way to undo a pick without
   * first expanding a list they have no reason to think is hiding it.
   */
  const visible = isExpanded
    ? LANGUAGES
    : LANGUAGES.filter(
        (language, index) => index < COLLAPSED_COUNT || selected.includes(language.code),
      );

  const hiddenCount = LANGUAGES.length - visible.length;

  function toggle(code) {
    if (!onChange) return;
    onChange(
      selected.includes(code)
        ? selected.filter((entry) => entry !== code)
        : [...selected, code],
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {visible.map((language) => {
          const isSelected = selected.includes(language.code);
          // The cap blocks new picks but never the tap that frees a slot.
          const isCapped = !isSelected && selected.length >= MAX_LANGUAGES;

          return (
            <Pressable
              key={language.code}
              onPress={() => toggle(language.code)}
              disabled={isCapped}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected, disabled: isCapped }}
              accessibilityLabel={language.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: isSelected ? `${colors.primary}18` : colors.surface,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? colors.primary : colors.border,
                opacity: isCapped ? 0.4 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: isSelected ? colors.primary : colors.textPrimary,
                }}
              >
                {language.native}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{language.label}</Text>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}

        {hiddenCount > 0 || isExpanded ? (
          <Pressable
            onPress={() => setIsExpanded((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Show fewer languages' : `Show ${hiddenCount} more languages`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: `${colors.primary}66`,
              backgroundColor: colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
              {isExpanded ? 'Show less' : `+${hiddenCount} more`}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.primary}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={{ marginTop: 8, fontSize: 11, color: colors.textMuted }}>
        {selected.length > 0
          ? `${selected.length} of ${MAX_LANGUAGES} selected`
          : hint || `Optional — pick up to ${MAX_LANGUAGES}.`}
      </Text>
    </View>
  );
}

export default LanguagePicker;
