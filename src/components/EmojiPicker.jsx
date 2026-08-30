import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * A curated set rather than the whole Unicode table.
 *
 * A full picker means shipping a font, a search index and a skin-tone
 * modifier UI; what people actually reach for in a chat is a couple of hundred
 * faces and hearts. Anything else can still be typed from the system keyboard.
 */
const GROUPS = [
  {
    key: 'smileys',
    label: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','😮','😯','😴',
      '😌','😔','😪','🤤','😷','🤒','🤕','🥴','😵','🤯','🥳','😎','🤓','🧐','😕','😟','🙁','😖','😞','😢',
      '😭','😤','😠','😡','🤬','😱','😨','😰','😥','🥺','😳','🤝','🙏','👏','🙌','👋','🤙','✌️','🤞','🤟',
    ],
  },
  {
    key: 'hearts',
    label: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
      '💋','😻','🥀','🌹','🌷','🌸','💐','✨','⭐','🌟','💫','🔥','💯','🎉','🎊','🎁','🎈','🥂','🍫','🧿',
    ],
  },
  {
    key: 'people',
    label: '👍',
    emojis: [
      '👍','👎','👌','🤌','✊','👊','🤛','🤜','💪','🦾','👀','👄','🧠','🫶','🤲','👐','💅','🕺','💃','🕴️',
      '👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','🙋','🙆','🤷','🤦','💁','🙇','🧏','🤱','👫','👬',
    ],
  },
  {
    key: 'things',
    label: '🎮',
    emojis: [
      '🎮','🎧','🎵','🎶','🎤','🎸','🥁','📷','📱','💻','⌚','🔋','💡','🔑','🎯','🎲','🏆','🥇','⚽','🏀',
      '🍕','🍔','🍟','🌮','🍿','🍩','🍪','🎂','🍰','☕','🍵','🥤','🍺','🍻','🥗','🍜','🍣','🍇','🍉','🍓',
    ],
  },
  {
    key: 'travel',
    label: '🌍',
    emojis: [
      '🌍','🌎','🌏','🗺️','🏔️','🏖️','🏝️','🌅','🌄','🌆','🌃','🌉','🎆','🌌','☀️','🌤️','⛅','🌧️','⛈️','🌈',
      '❄️','⛄','🌊','🚗','🚕','🚌','🏍️','✈️','🚀','🛸','⛵','🚢','🚲','🛵','🏠','🏡','🏢','⛺','🎡','🎢',
    ],
  },
];

/**
 * The emoji tray under a composer.
 *
 * Tapping inserts rather than replaces, so a caption can mix words and faces —
 * closing the tray after every single emoji would make picking three of them
 * a three-round trip.
 */
export function EmojiPicker({ onSelect, onClose }) {
  const { colors } = useTheme();
  const [group, setGroup] = useState(GROUPS[0].key);

  const active = GROUPS.find((entry) => entry.key === group) ?? GROUPS[0];

  return (
    <View
      style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}
      className="pb-1"
    >
      <View className="flex-row items-center justify-between px-3 pt-2">
        <View className="flex-row gap-1">
          {GROUPS.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => setGroup(entry.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: entry.key === group }}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: entry.key === group ? colors.surfaceAlt : 'transparent' }}
            >
              <Text className="text-lg">{entry.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close emoji picker" className="px-2">
          <Text className="text-[13px]" style={{ color: colors.textMuted }}>
            Close
          </Text>
        </Pressable>
      </View>

      <FlatList
        key={active.key}
        data={active.emojis}
        numColumns={8}
        keyExtractor={(item, index) => `${item}-${index}`}
        style={{ maxHeight: 210 }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${item}`}
            className="flex-1 items-center justify-center py-2"
          >
            <Text className="text-2xl">{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
