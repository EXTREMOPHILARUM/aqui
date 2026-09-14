import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { BackIcon } from './Icons';

export type SensorPresence = 'connected' | 'found' | 'none';

interface TopBarProps {
  title: string;
  presence: SensorPresence;
  sensorLabel: string;
  onBack?: () => void;
}

/** Filled black when connected, coral when the sensor needs attention, an outline when absent. */
const MARKER: Record<SensorPresence, ViewStyle> = {
  connected: { backgroundColor: colors.ink },
  found: { backgroundColor: colors.coral },
  none: { borderWidth: 1, borderColor: colors.faint },
};

/**
 * Uppercase title (with a back chevron on inner screens) and sensor presence,
 * over a black hairline.
 */
const TopBar: React.FC<TopBarProps> = ({ title, presence, sensorLabel, onBack }) => (
  <View style={styles.container}>
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon />
          <Text style={styles.title}>{title}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      <View style={styles.status}>
        <View style={[styles.marker, MARKER[presence]]} />
        <Text style={[styles.statusText, presence === 'none' && styles.statusIdle]}>{sensorLabel}</Text>
      </View>
    </View>
    <View style={styles.rule} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingRight: 12,
  },
  title: {
    fontFamily: fonts.montserratBold,
    fontSize: 16,
    lineHeight: 30,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marker: {
    width: 8,
    height: 8,
  },
  statusText: {
    fontFamily: fonts.montserratBold,
    fontSize: 12,
    lineHeight: 30,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  statusIdle: {
    color: colors.faint,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
});

export default TopBar;
