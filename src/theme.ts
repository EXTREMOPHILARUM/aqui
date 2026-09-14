/**
 * Visual system in xkdr.org's design language: warm paper, black, and a coral
 * display accent; Montserrat for headings, labels and buttons, Merriweather
 * for reading text; square corners throughout.
 */
import { AirQualityIndex } from './utils/sensorUtils';

export const colors = {
  paper: '#f2f1f0',
  ink: '#000000',
  body: '#212529',
  muted: '#4b4b4b',
  faint: '#7a7a7a',
  rule: '#d6d6d6',
  coral: '#f57d6a',
  /** Large numbers and screen titles. Coral is below text-contrast minimums on paper; use ink to fix that. */
  display: '#f57d6a',
};

/**
 * Static faces bundled in android/app/src/main/assets/fonts. Use the face
 * name as fontFamily and never add fontWeight, or Android synthesises bold.
 */
export const fonts = {
  montserratSemiBold: 'Montserrat-SemiBold',
  montserratBold: 'Montserrat-Bold',
  montserratExtraBold: 'Montserrat-ExtraBold',
  montserratBlack: 'Montserrat-Black',
  merriweather: 'Merriweather-Regular',
};

export interface Band {
  label: string;
  hint: string;
  swatch: string;
}

const BANDS: Record<string, Band> = {
  Good: { label: 'Good', hint: 'Clean air right now.', swatch: '#3cb46e' },
  Moderate: { label: 'Moderate', hint: 'Fine for most people.', swatch: '#e9c046' },
  'Unhealthy for Sensitive Groups': {
    label: 'Sensitive groups',
    hint: 'Take care if you are sensitive.',
    swatch: '#ee8a3c',
  },
  Unhealthy: { label: 'Unhealthy', hint: 'Everyone may feel effects.', swatch: '#d9483b' },
  'Very Unhealthy': { label: 'Very unhealthy', hint: 'Health alert. Stay inside.', swatch: '#8f4fb3' },
  Hazardous: { label: 'Hazardous', hint: 'Emergency conditions.', swatch: '#7e2344' },
};

export const pm25Band = (value: number): Band => BANDS[AirQualityIndex.getPM25Category(value)];
export const pm10Band = (value: number): Band => BANDS[AirQualityIndex.getPM10Category(value)];
