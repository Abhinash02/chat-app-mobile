import { Text, View } from 'react-native';

/**
 * Premium, crisp Golden Coin Icon component.
 * Renders consistently across iOS, Android, and Web with metallic gold shine.
 */
export function CoinIcon({ size = 20, style }) {
  const innerSize = Math.round(size * 0.78);
  const fontSize = Math.max(9, Math.round(size * 0.48));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#F59E0B',
          borderWidth: Math.max(1, Math.round(size * 0.08)),
          borderColor: '#FDE68A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#D97706',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.35,
          shadowRadius: 2,
          elevation: 2,
        },
        style,
      ]}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: '#D97706',
          borderWidth: 1,
          borderColor: '#FEF3C7',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#FEF3C7',
            fontSize,
            fontWeight: '900',
            lineHeight: fontSize + 2,
            textAlign: 'center',
          }}
        >
          ¢
        </Text>
      </View>
    </View>
  );
}
