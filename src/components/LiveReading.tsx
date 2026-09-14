import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, pm25Band, pm10Band } from '../theme';
import Button from './Button';

interface LiveReadingProps {
  pm25: number;
  pm10: number;
  avgPm25: number | null;
  avgPm10: number | null;
  readingsCount: number;
  lastUpdate: string | null;
  onShowLogs: () => void;
}

const whole = (v: number) => Math.round(v).toString();

/**
 * The live reading: PM2.5 as a large display number with its category, PM10
 * in one row, averages and time over the Logs button.
 *
 * Labels are written in capitals rather than transformed: uppercasing
 * "µg/m³" would render "ΜG/M³", which reads as milligrams.
 */
const LiveReading: React.FC<LiveReadingProps> = ({ pm25, pm10, avgPm25, avgPm10, readingsCount, lastUpdate, onShowLogs }) => {
  const band = pm25Band(pm25);
  const band10 = pm10Band(pm10);
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View>
          <Text style={styles.labelLarge}>PM2.5 · µg/m³</Text>
          <Text style={styles.number} numberOfLines={1} adjustsFontSizeToFit={true}>
            {whole(pm25)}
          </Text>
        </View>

        <View style={styles.bandBlock}>
          <View style={styles.bandRow}>
            <View style={[styles.swatch, { backgroundColor: band.swatch }]} />
            <Text style={styles.bandLabel}>{band.label}</Text>
          </View>
          <Text style={styles.hint}>{band.hint}</Text>
        </View>

        <View style={styles.hairline} />

        <View style={styles.pm10Row}>
          <View>
            <Text style={styles.labelSmall}>PM10 · µg/m³</Text>
            <Text style={styles.pm10}>{whole(pm10)}</Text>
          </View>
          <View style={styles.pm10Band}>
            <View style={[styles.swatchSmall, { backgroundColor: band10.swatch }]} />
            <Text style={styles.pm10BandLabel}>{band10.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.rule} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            {avgPm25 !== null && avgPm10 !== null && readingsCount > 1
              ? `Average of last ${readingsCount}: ${whole(avgPm25)} · ${whole(avgPm10)}`
              : 'First reading'}
          </Text>
          <Text style={styles.time}>{lastUpdate ?? ''}</Text>
        </View>
        <Button label="Logs" onPress={onShowLogs} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  labelLarge: {
    fontFamily: fonts.montserratBold,
    fontSize: 14,
    lineHeight: 30,
    color: colors.ink,
  },
  number: {
    fontFamily: fonts.montserratExtraBold,
    fontSize: 200,
    lineHeight: 170,
    letterSpacing: -10,
    marginLeft: -10,
    color: colors.display,
    includeFontPadding: false,
  },
  bandBlock: {
    gap: 2,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 16,
    height: 16,
  },
  bandLabel: {
    fontFamily: fonts.montserratExtraBold,
    fontSize: 20,
    lineHeight: 30,
    color: colors.ink,
  },
  hint: {
    fontFamily: fonts.merriweather,
    fontSize: 14,
    lineHeight: 25,
    color: colors.muted,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.rule,
    marginTop: 8,
  },
  pm10Row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  labelSmall: {
    fontFamily: fonts.montserratBold,
    fontSize: 12,
    lineHeight: 25,
    color: colors.muted,
  },
  pm10: {
    fontFamily: fonts.montserratExtraBold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.44,
    color: colors.ink,
    includeFontPadding: false,
  },
  pm10Band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
  },
  swatchSmall: {
    width: 12,
    height: 12,
  },
  pm10BandLabel: {
    fontFamily: fonts.montserratExtraBold,
    fontSize: 16,
    lineHeight: 30,
    color: colors.ink,
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
  time: {
    fontFamily: fonts.montserratSemiBold,
    fontSize: 12,
    lineHeight: 25,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});

export default LiveReading;
