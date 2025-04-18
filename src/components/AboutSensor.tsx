import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AboutSensor: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About SDS011/SDS021 PM Sensors</Text>
      <Text style={styles.aboutText}>
        The SDS011 and SDS021 are laser particle sensors that can measure PM2.5 and PM10 
        particulate matter concentrations in the air. These sensors use the principle of 
        light scattering to measure particle concentration between 0.3 to 10μm in diameter.
        {'\n\n'}
        PM2.5 refers to particles smaller than 2.5μm, which can penetrate deep into the lungs.
        PM10 refers to particles smaller than 10μm, which can enter the respiratory system.
        {'\n\n'}
        Air Quality Index (AQI) ranges for PM2.5:
        {'\n'}• 0-12 μg/m³: Good
        {'\n'}• 12-35 μg/m³: Moderate
        {'\n'}• 35-55 μg/m³: Unhealthy for Sensitive Groups
        {'\n'}• 55-150 μg/m³: Unhealthy
        {'\n'}• 150-250 μg/m³: Very Unhealthy
        {'\n'}• 250+ μg/m³: Hazardous
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  }
});

export default AboutSensor; 