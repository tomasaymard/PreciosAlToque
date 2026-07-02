import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Brand, Type } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

// Nota: con fuentes custom en React Native, cada peso es una familia distinta
// (Nunito_700Bold, etc.) — usar fontWeight con fuente custom produce "negrita
// falsa" en Android. Por eso cada estilo fija su fontFamily.
const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Type.regular,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Type.semibold,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: Type.bold,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: Type.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: Type.regular,
    color: Brand.primary,
  },
});
