import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPM25Category, getPM10Category } from '../utils/sensorUtils';

interface SensorDataProps {
  pm25: number | null;
  pm10: number | null;
  avgPm25?: number | null;
  avgPm10?: number | null;
  readingsCount?: number;
  lastUpdate: string | null;
  connected: boolean;
  packetType?: 'standard' | 'modified' | null;
}

const SensorData: React.FC<SensorDataProps> = ({ 
  pm25, 
  pm10, 
  avgPm25 = null,
  avgPm10 = null,
  readingsCount = 0,
  lastUpdate, 
  connected,
  packetType
}) => {
  // Use average values if available, otherwise fall back to current readings
  const displayPm25 = avgPm25 !== null && readingsCount > 0 ? avgPm25 : pm25;
  const displayPm10 = avgPm10 !== null && readingsCount > 0 ? avgPm10 : pm10;

  return (
    <View style={styles.sensorDataContainer}>
      {displayPm25 === null || displayPm10 === null ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No valid data packets detected</Text>
          <Text style={styles.noDataSubtext}>
            {connected 
              ? 'Sensor connected. Waiting for valid data...' 
              : 'Connect to a device to start reading'
            }
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.readingTabs}>
            <Text style={styles.tabHeader}>Air Quality</Text>
            <View style={styles.sensorRow}>
              <View style={styles.sensorValue}>
                <Text style={styles.sensorLabel}>PM2.5</Text>
                <Text style={[
                  styles.sensorReading, 
                  displayPm25 <= 12 ? styles.goodReading : 
                  displayPm25 <= 35 ? styles.moderateReading : 
                  displayPm25 <= 55 ? styles.unhealthySensitiveReading :
                  displayPm25 <= 150 ? styles.unhealthyReading :
                  displayPm25 <= 250 ? styles.veryUnhealthyReading : 
                  styles.hazardousReading
                ]}>
                  {displayPm25.toFixed(1)}
                </Text>
                <Text style={styles.sensorUnit}>µg/m³</Text>
                <Text style={styles.sensorInfo}>
                  {getPM25Category(displayPm25)}
                </Text>
              </View>
              
              <View style={styles.sensorValue}>
                <Text style={styles.sensorLabel}>PM10</Text>
                <Text style={[
                  styles.sensorReading,
                  displayPm10 <= 54 ? styles.goodReading : 
                  displayPm10 <= 154 ? styles.moderateReading : 
                  displayPm10 <= 254 ? styles.unhealthySensitiveReading :
                  displayPm10 <= 354 ? styles.unhealthyReading :
                  displayPm10 <= 424 ? styles.veryUnhealthyReading : 
                  styles.hazardousReading
                ]}>
                  {displayPm10.toFixed(1)}
                </Text>
                <Text style={styles.sensorUnit}>µg/m³</Text>
                <Text style={styles.sensorInfo}>
                  {getPM10Category(displayPm10)}
                </Text>
              </View>
            </View>
          </View>
          
          {lastUpdate && (
            <View style={styles.infoContainer}>
              <Text style={styles.lastUpdate}>Last updated: {lastUpdate}</Text>
              {packetType && (
                <Text style={styles.packetType}>
                  Packet format: {packetType === 'standard' 
                    ? 'Standard (AA...AB)' 
                    : 'Modified (0A prefix for each byte)'
                  }
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sensorDataContainer: {
    alignItems: 'center',
    padding: 16,
  },
  readingTabs: {
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
  },
  tabHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sensorValue: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  sensorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  sensorReading: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  sensorUnit: {
    fontSize: 14,
    color: '#666',
  },
  sensorInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
  },
  packetType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
  },
  goodReading: {
    color: '#4CAF50',
  },
  moderateReading: {
    color: '#FFA500',
  },
  unhealthySensitiveReading: {
    color: '#FF5733',
  },
  unhealthyReading: {
    color: '#FF3333',
  },
  veryUnhealthyReading: {
    color: '#FF33FF',
  },
  hazardousReading: {
    color: '#FF3333',
  },
});

export default SensorData; 