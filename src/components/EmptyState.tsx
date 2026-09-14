import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { UsbIcon, LockIcon } from './Icons';
import Button from './Button';

interface EmptyStateProps {
  icon: 'usb' | 'lock';
  title: string;
  body: string;
  footerLeft: string;
  footerRight?: React.ReactNode;
  buttonLabel: string;
  onButton: () => void;
}

/**
 * Shared layout for the states without a reading: no sensor, waiting for USB
 * permission, listening. Same skeleton as the live screen so nothing jumps.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, body, footerLeft, footerRight, buttonLabel, onButton }) => (
  <View style={styles.container}>
    <View style={styles.center}>
      {icon === 'usb' ? <UsbIcon /> : <LockIcon />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
    <View style={styles.footer}>
      <View style={styles.rule} />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{footerLeft}</Text>
        {footerRight}
      </View>
      <Button label={buttonLabel} onPress={onButton} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontFamily: fonts.montserratBold,
    fontSize: 32,
    lineHeight: 40,
    color: colors.display,
  },
  body: {
    fontFamily: fonts.merriweather,
    fontSize: 14,
    lineHeight: 25,
    color: colors.body,
  },
  footer: {
    gap: 16,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  footerText: {
    flexShrink: 1,
    fontFamily: fonts.merriweather,
    fontSize: 14,
    lineHeight: 25,
    color: colors.body,
  },
});

export const LastReading: React.FC<{ pm25: number; pm10: number }> = ({ pm25, pm10 }) => (
  <View style={lastStyles.row}>
    <Text style={lastStyles.value}>{`${Math.round(pm25)} · ${Math.round(pm10)}`}</Text>
    <Text style={lastStyles.unit}>µg/m³</Text>
  </View>
);

const lastStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontFamily: fonts.montserratExtraBold,
    fontSize: 14,
    lineHeight: 25,
    color: colors.ink,
  },
  unit: {
    fontFamily: fonts.merriweather,
    fontSize: 12,
    lineHeight: 25,
    color: colors.muted,
  },
});

export default EmptyState;
