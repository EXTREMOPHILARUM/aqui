import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

interface IconProps {
  size?: number;
  color?: string;
}

/** USB plug: stem, arrow head and a square contact. Square caps to match the square-cornered UI. */
export const UsbIcon: React.FC<IconProps> = ({ size = 48, color = colors.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
    <Path d="M12 3v18" />
    <Path d="M12 21l-4-4" />
    <Path d="M12 21l4-4" />
    <Rect x={10.5} y={4.5} width={3} height={3} />
    <Path d="M8 9l4 3 4-3" />
  </Svg>
);

/** Padlock, for the USB permission state. */
export const LockIcon: React.FC<IconProps> = ({ size = 48, color = colors.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
    <Rect x={4} y={10} width={16} height={11} />
    <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <Path d="M12 14.5v3" />
  </Svg>
);

/** Back chevron. */
export const BackIcon: React.FC<IconProps> = ({ size = 24, color = colors.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
    <Path d="M15 5l-7 7 7 7" />
  </Svg>
);
