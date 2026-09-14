import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
}

/** Square block button, 48 high: solid black, or paper with a black outline. */
const Button: React.FC<ButtonProps> = ({ label, onPress, variant = 'solid' }) => (
  <TouchableOpacity
    style={[styles.base, variant === 'solid' ? styles.solid : styles.outline]}
    onPress={onPress}
    accessibilityRole="button">
    <Text style={[styles.label, variant === 'solid' ? styles.labelSolid : styles.labelOutline]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: colors.ink,
  },
  outline: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: fonts.montserratBlack,
    fontSize: 12,
    letterSpacing: 1.44,
    textTransform: 'uppercase',
  },
  labelSolid: {
    color: colors.paper,
  },
  labelOutline: {
    color: colors.ink,
  },
});

export default Button;
