import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider.jsx';

const ActionSheetContext = createContext(null);

/**
 * A confirm dialog and action chooser that works everywhere.
 *
 * React Native's `Alert.alert` is a real dialog on iOS and Android and an
 * empty function on web — react-native-web ships `static alert() {}`, so every
 * call silently does nothing. That is not a degraded experience, it is a dead
 * button: the status delete and the room attachment picker both looked broken
 * in the browser while working fine on a phone, with no error anywhere.
 *
 * This renders the sheet itself, so the same code path runs on all three.
 */
export function ActionSheetProvider({ children }) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState(null);

  const show = useCallback((options) => setRequest(options), []);

  /*
   * `onClose` fires however the sheet goes away — cancelled, dismissed by a
   * tap outside, or an option chosen. Callers use it to undo whatever they
   * suspended while asking, and a path that skipped it would leave a screen
   * paused with no visible reason.
   */
  const dismiss = useCallback(() => {
    setRequest((current) => {
      current?.onClose?.();
      return null;
    });
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  function choose(option) {
    // Closed first: an option that navigates would otherwise leave the sheet
    // mounted over the screen it opened.
    setRequest(null);
    request?.onClose?.();
    option.onPress?.();
  }

  return (
    <ActionSheetContext.Provider value={value}>
      {children}

      <Modal
        visible={Boolean(request)}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={dismiss}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius * 2,
              borderTopRightRadius: radius * 2,
              paddingBottom: insets.bottom + 10,
            }}
          >
            <View className="items-center py-3">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
            </View>

            {request?.title ? (
              <Text
                className="px-5 pb-1 text-center text-base font-semibold"
                style={{ color: colors.textPrimary }}
              >
                {request.title}
              </Text>
            ) : null}

            {request?.message ? (
              <Text className="px-6 pb-3 text-center text-[13px]" style={{ color: colors.textSecondary }}>
                {request.message}
              </Text>
            ) : null}

            <View className="px-3 pt-1">
              {(request?.options ?? []).map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => choose(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  className="items-center py-3.5"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                    borderRadius: radius,
                  })}
                >
                  <Text
                    className="text-[15px] font-medium"
                    style={{ color: option.destructive ? colors.danger : colors.textPrimary }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                className="mt-1 items-center py-3.5"
                style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
              >
                <Text className="text-[15px] font-semibold" style={{ color: colors.textSecondary }}>
                  {request?.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ActionSheetContext.Provider>
  );
}

export function useActionSheet() {
  const context = useContext(ActionSheetContext);
  if (!context) throw new Error('useActionSheet must be used inside an ActionSheetProvider');
  return context;
}
